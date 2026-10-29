import {
	BRIEF_AHEAD_HOURS,
	FINAL_SESSION,
	SCOPE_SESSION,
} from "@/config/checkpoint";
import {
	CheckpointCuratorKind,
	CheckpointJournalKind,
	CheckpointSessionContentStatus,
	CheckpointStatus,
} from "@/config/prisma-enums";
import { planCloses, planEdit, planSession } from "@/lib/checkpoints/call";
import { lettersSoFar } from "@/lib/checkpoints/curator-letters";
import { MS_PER_HOUR } from "@/lib/checkpoints/days";
import { reviewUrl } from "@/lib/checkpoints/hrefs";
import { sprintRange } from "@/lib/checkpoints/sprints";
import { CHECKPOINT_RUNNING_STATUSES } from "@/lib/checkpoints/status";
import {
	curatorTeam,
	projectPicture,
	runPeriod,
	stageWorkflow,
} from "@/repositories/checkpoints/ai-curator-context";
import {
	knownOnly,
	sprintEvidence,
} from "@/repositories/checkpoints/call-notes";
import { journal } from "@/repositories/checkpoints/journal";
import { checkpointNumber } from "@/repositories/checkpoints/number";
import { recipient } from "@/repositories/checkpoints/recipient";
import {
	type AdviceRefusal,
	hashOf,
	type ReviewCheckpoint,
	reviewSelect,
	type TaskRow,
	taskSelect,
} from "@/repositories/checkpoints/review";
import { canEditPlan } from "@/repositories/checkpoints/viewer";
import { CONFIRMED_MEMBERS } from "@/repositories/scout.games";
import {
	midwayAdviceInput,
	type PlanAdviceInput,
	reviewSprint,
	writePlanAdvice,
	writeSprintReview,
} from "@/services/checkpoints/ai-review";
import { toCuratorTask } from "@/services/checkpoints/call-notes";
import {
	closeCheckpoint,
	writeFirstLetter,
} from "@/services/checkpoints/flows/ai-curator";
import {
	devlogMediaLines,
	seeCheckpointEvidence,
	sprintArtifactLines,
} from "@/services/checkpoints/flows/evidence-seen";
import {
	notify,
	notifyPlanChecked,
} from "@/services/checkpoints/notifications";
import { notifyVerdictSent } from "@/services/checkpoints/verdict-notifications";
import { prisma } from "@/services/prisma";
import type {
	CuratorTeam,
	CuratorWorkflow,
	JournalEntry,
} from "@/types/checkpoint-curator";
import type { CallNotes, CuratorReview, PlanAdvice } from "@/types/checkpoints";

/**
 * The AI's read of the tasks as saved, written on the session the plan is open
 * on — the AI curator's start and day 15, or a pro checkpoint's draft before
 * call 1. The same plan is not read twice: the answer is kept with the
 * hash of what it answered. The AI curator's start is checked once, on the
 * tasks the author sends; before its first letter, this writes that instead.
 */
export const adviseOnPlan = async (
	checkpointId: string,
	userId: string,
	now = new Date(),
	/** Where the letter goes out: after the response in a request, inline otherwise. */
	later: (task: () => Promise<void>) => unknown = (task) => task(),
): Promise<AdviceRefusal | null> => {
	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id: checkpointId },
		select: {
			curatorId: true,
			curatorKind: true,
			goal: true,
			curatorCharacter: true,
			goalAgreedAt: true,
			planCheckedAt: true,
			scopeConfirmedAt: true,
			projectId: true,
			stageName: true,
			stepId: true,
			startedAt: true,
			project: { select: { authorId: true } },
			sessions: {
				select: {
					id: true,
					index: true,
					scheduledAt: true,
					endedAt: true,
					content: true,
				},
			},
			items: taskSelect,
		},
	});
	if (!checkpoint) return "notFound";
	if (!canEditPlan(checkpoint, userId)) return "forbidden";
	const ai = checkpoint.curatorKind === CheckpointCuratorKind.AI;
	const edit = planEdit(checkpoint, now);
	// A pro curator agrees the plan on the calls; the AI reads the author's draft before call 1.
	if (!ai && edit !== "plan") return "planClosed";
	const index = planSession(edit);
	const session = checkpoint.sessions.find((row) => row.index === index);
	if (!session) return "planClosed";

	const content = session.content as CuratorReview | null;
	const start = ai && index === 1;
	if (start && !content) {
		// The read after payment failed: the page asks for the letter on first open.
		return (await writeFirstLetter(checkpointId, { notify: false }))
			? null
			: "failed";
	}
	if (start && checkpoint.planCheckedAt) return "alreadyChecked";
	if (start && !checkpoint.items.some((item) => !item.cut)) return "noTasks";

	const input = adviceInput(
		checkpoint,
		await stageWorkflow(checkpoint.stepId, checkpoint.stageName),
		await curatorTeam(checkpointId, checkpoint.projectId, checkpoint.startedAt),
		index === 1 ? "start" : "midway",
		content?.notes?.inShort ?? null,
		// Halfway reads the first two sprints, a period that does not move day by day.
		await projectPicture(
			checkpointId,
			checkpoint.startedAt && index !== 1
				? {
						from: checkpoint.startedAt,
						to: sprintRange(checkpoint.startedAt, 2).to,
					}
				: undefined,
		),
		checkpoint.curatorCharacter,
		lettersSoFar(checkpoint.sessions, session.index + 1),
	);
	if (content?.advice?.hash === hashOf(input)) return null;

	const written = await adviceFor(input, checkpoint.items, checkpointId).catch(
		(error) => {
			console.error("[curator-review] plan advice failed", checkpointId, error);
			return null;
		},
	);
	if (!written) return "failed";

	await prisma.checkpointSession.update({
		where: { id: session.id },
		data: {
			// The start's letter is the advice itself; a review keeps its own.
			content: {
				...content,
				message: content?.notes
					? content.message
					: (written.message ?? content?.message ?? ""),
				notes: content?.notes ?? null,
				advice: written.advice,
				goal: written.goal ?? content?.goal,
				...(start && {
					firstLetter: content?.firstLetter ?? content?.message,
				}),
			} satisfies CuratorReview,
			// With a pro curator the session stays unwritten: call 1's notes
			// claim it by a null status, and they replace this draft advice.
			...(ai && { contentStatus: CheckpointSessionContentStatus.Ready }),
		},
	});
	await journal({
		checkpointId,
		kind: CheckpointJournalKind.Letter,
		sprint: start ? null : SCOPE_SESSION - 1,
		input,
		output: written,
	});
	if (start) {
		await prisma.projectCheckpoint.update({
			where: { id: checkpointId },
			data: { planCheckedAt: now },
		});
		const closes = planCloses({ ...checkpoint, planCheckedAt: now });
		if (closes) await later(() => notifyPlanChecked(checkpointId, closes));
	}
	return null;
};

/** What the model is given for advice on the plan — and what its hash answers. */
const adviceInput = (
	checkpoint: {
		goal: string;
		items: Parameters<typeof toCuratorTask>[0][];
	},
	workflow: CuratorWorkflow,
	team: CuratorTeam,
	moment: PlanAdviceInput["moment"],
	review: string | null,
	picture: string,
	character: string | null,
	journal: JournalEntry[],
): PlanAdviceInput => ({
	goal: checkpoint.goal,
	character,
	journal,
	workflow,
	team,
	tasks: checkpoint.items.map(toCuratorTask),
	moment,
	review,
	picture,
});

/** The model's advice, kept for open tasks only and none it made up. */
const adviceFor = async (
	input: PlanAdviceInput,
	items: TaskRow[],
	checkpointId: string,
) => {
	const written = await writePlanAdvice(input, {
		checkpointId,
		purpose: "planAdvice",
	});
	if (!written) return null;
	const open = new Set(
		items
			.filter((item) => !item.cut && !item.evidence.length)
			.map((item) => item.id),
	);
	const advice: PlanAdvice = {
		tasks: written.tasks.filter((row) => open.has(row.itemId)),
		add: written.add,
		hash: hashOf(input),
	};
	return { message: written.message, advice, goal: written.goal };
};

/**
 * The daily run: an AI checkpoint's review day has come — sprints 1–3 on days
 * 8, 15 and 22, the final review once its 28 days are over. Each session is
 * claimed first so two runs never write it twice; a failure hands it back.
 */
export const writeDueReviews = async (now = new Date()) => {
	const due = await prisma.checkpointSession.findMany({
		where: {
			contentStatus: null,
			scheduledAt: { lte: now },
			OR: [
				{
					index: { gt: 1, lt: FINAL_SESSION },
					checkpoint: {
						curatorKind: CheckpointCuratorKind.AI,
						status: CheckpointStatus.Active,
					},
				},
				{
					index: FINAL_SESSION,
					checkpoint: {
						curatorKind: CheckpointCuratorKind.AI,
						status: { in: [CheckpointStatus.Review, CheckpointStatus.Closed] },
					},
				},
			],
		},
		select: { id: true },
	});

	let written = 0;
	for (const { id } of due) {
		const { count } = await prisma.checkpointSession.updateMany({
			where: { id, contentStatus: null },
			data: { contentStatus: CheckpointSessionContentStatus.Pending },
		});
		if (!count) continue;

		const ok = await writeReviewFor(id, now).catch((error) => {
			console.error("[curator-review] failed for session", id, error);
			return false;
		});
		if (ok) {
			written += 1;
		} else {
			await prisma.checkpointSession.update({
				where: { id },
				data: { contentStatus: null },
			});
		}
	}
	return written;
};

/**
 * The sprint behind a session, as the model reads it: its devlogs and what
 * their media show, its artifacts, the pulse, and the focus the last call or
 * review agreed. The final review reads the whole run and the settled verdict.
 */
const sprintReviewInput = async (
	checkpoint: ReviewCheckpoint,
	startedAt: Date,
	sessionIndex: number,
	final: boolean,
) => {
	const sprint = sessionIndex - 1;
	const [{ devlogs, posts, artifacts }, picture, workflow, team] =
		await Promise.all([
			sprintEvidence(checkpoint.projectId, startedAt, sprint),
			projectPicture(
				checkpoint.id,
				final
					? runPeriod(startedAt, checkpoint.dueAt)
					: sprintRange(startedAt, sprint),
			),
			stageWorkflow(checkpoint.stepId, checkpoint.stageName),
			curatorTeam(checkpoint.id, checkpoint.projectId, startedAt),
		]);
	const [devlogMedia, artifactsSeen] = await Promise.all([
		devlogMediaLines(posts.map((post) => post.id)),
		sprintArtifactLines(checkpoint.id, sprint),
	]);
	// An AI review keeps its notes under `notes`; a human call's notes are the content.
	const previous = checkpoint.sessions.find(
		(row) => row.index === sessionIndex - 1,
	)?.content as
		| (Partial<CuratorReview> & Partial<CallNotes>)
		| null
		| undefined;
	const agreed = (previous?.notes ?? previous)?.agreed ?? [];

	return {
		goal: checkpoint.goal,
		character: checkpoint.curatorCharacter,
		journal: lettersSoFar(checkpoint.sessions, sessionIndex),
		workflow,
		sprint,
		tasks: checkpoint.items.map(toCuratorTask),
		devlogs,
		devlogMedia,
		artifactsSeen,
		artifacts,
		team,
		focusLastReview: agreed.map((line) => line.text),
		verdict:
			final && checkpoint.verdict
				? { verdict: checkpoint.verdict, note: checkpoint.verdictNote ?? "" }
				: null,
		picture,
	};
};

/** One session's review, now. The daily run claims it first; a dev script calls it directly. */
export const writeReviewFor = async (sessionId: string, now: Date) => {
	const session = await prisma.checkpointSession.findUniqueOrThrow({
		where: { id: sessionId },
		select: { index: true, checkpointId: true },
	});
	const final = session.index === FINAL_SESSION;
	// The verdict comes first, so the last letter can agree with it; it looks at
	// the evidence itself. A sprint review looks first at anything missed.
	if (final) await closeCheckpoint(session.checkpointId);
	else await seeCheckpointEvidence(session.checkpointId);

	const checkpoint = await prisma.projectCheckpoint.findUniqueOrThrow({
		where: { id: session.checkpointId },
		select: {
			...reviewSelect,
			createdAt: true,
			project: {
				select: {
					name: true,
					slug: true,
					author: recipient,
					team: {
						select: {
							members: {
								where: CONFIRMED_MEMBERS,
								select: { user: recipient },
							},
						},
					},
				},
			},
		},
	});
	const { startedAt } = checkpoint;
	if (!startedAt || (final && !checkpoint.verdict)) return false;

	const sprint = session.index - 1;
	const input = await sprintReviewInput(
		checkpoint,
		startedAt,
		session.index,
		final,
	);
	// Halfway the tasks change for the last time.
	const advise =
		session.index === SCOPE_SESSION
			? async (review: string) =>
					(
						await adviceFor(
							midwayAdviceInput(input, review),
							checkpoint.items,
							session.checkpointId,
						)
					)?.advice ?? null
			: null;
	const review = await reviewSprint(input, advise, {
		checkpointId: session.checkpointId,
		purpose: "sprintReview",
	});
	if (!review) return false;

	const notes = knownOnly(review.notes, checkpoint.items);

	await prisma.checkpointSession.update({
		where: { id: sessionId },
		data: {
			content: {
				message: review.message,
				notes,
				advice: review.advice,
			} satisfies CuratorReview,
			contentStatus: CheckpointSessionContentStatus.Ready,
			endedAt: now,
		},
	});
	await journal({
		checkpointId: session.checkpointId,
		kind: CheckpointJournalKind.Review,
		sprint,
		input,
		output: { message: review.message, notes, advice: review.advice },
	});

	if (final) {
		await notifyVerdictSent(checkpoint.id);
		return true;
	}
	const number = await checkpointNumber(checkpoint);
	const people = new Map(
		(checkpoint.project.team?.members ?? []).map((member) => [
			member.user.id,
			member.user,
		]),
	);
	people.set(checkpoint.project.author.id, checkpoint.project.author);
	await Promise.all(
		[...people.values()].map((person) =>
			notify(person, `cp-review-${sessionId}-${person.id}`, {
				checkpointId: checkpoint.id,
				title: `The Sprint ${sprint} review of ${checkpoint.project.name} is ready`,
				message:
					session.index === SCOPE_SESSION
						? "What the sprint showed, the focus for the next one, and the curator's advice on the tasks. This is the last change to them: adjust them if needed and press Confirm the tasks by this time tomorrow."
						: "What the sprint showed and the focus for the next one.",
				redirectUrl: reviewUrl(
					checkpoint.project.slug,
					number,
					session.index,
					"review",
				),
			}),
		),
	);
	return true;
};

/**
 * The night before a human curator's calls 2–5 (GDHUB-114): the sprint behind
 * the call as the AI read it, for the curator only. The daily run at 01:00 UTC
 * writes one for every call starting within the next 24 hours.
 */
export const writeDueBriefs = async (now = new Date()) => {
	const due = await prisma.checkpointSession.findMany({
		where: {
			index: { gt: 1 },
			endedAt: null,
			scheduledAt: {
				gt: now,
				lte: new Date(now.getTime() + BRIEF_AHEAD_HOURS * MS_PER_HOUR),
			},
			checkpoint: {
				curatorKind: CheckpointCuratorKind.Human,
				status: { in: CHECKPOINT_RUNNING_STATUSES },
			},
		},
		select: { id: true },
	});

	let written = 0;
	for (const { id } of due) {
		const ok = await writeBriefFor(id).catch((error) => {
			console.error("[curator-brief] failed for session", id, error);
			return false;
		});
		if (ok) written += 1;
	}
	return written;
};

/** One call's brief, once: a brief already in the journal is never written again. */
export const writeBriefFor = async (sessionId: string) => {
	const session = await prisma.checkpointSession.findUniqueOrThrow({
		where: { id: sessionId },
		select: { index: true, checkpointId: true },
	});
	const { checkpointId } = session;
	const sprint = session.index - 1;
	const written = await prisma.checkpointJournalEntry.findFirst({
		where: { checkpointId, kind: CheckpointJournalKind.Review, sprint },
		select: { id: true },
	});
	if (written) return false;

	await seeCheckpointEvidence(checkpointId);
	const checkpoint = await prisma.projectCheckpoint.findUniqueOrThrow({
		where: { id: checkpointId },
		select: reviewSelect,
	});
	const { startedAt } = checkpoint;
	if (!startedAt) return false;

	const input = await sprintReviewInput(
		checkpoint,
		startedAt,
		session.index,
		false,
	);
	const review = await writeSprintReview(input, {
		checkpointId,
		purpose: "callBrief",
	});
	if (!review) return false;

	await journal({
		checkpointId,
		kind: CheckpointJournalKind.Review,
		sprint,
		input,
		output: {
			audience: "curator",
			// The focus is agreed on the call, not proposed in the brief.
			notes: knownOnly({ ...review, agreed: [] }, checkpoint.items),
			// What the curator's card shows beside each task, so it never reads the input.
			seen: input.tasks.flatMap((task) =>
				task.evidence.flatMap((piece) =>
					piece.seen ? [{ itemId: task.id, ...piece.seen }] : [],
				),
			),
		},
	});
	return true;
};
