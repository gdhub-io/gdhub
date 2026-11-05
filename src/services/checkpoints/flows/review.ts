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
import { changeBetween, directionOf } from "@/lib/checkpoints/picture";
import { sprintRange } from "@/lib/checkpoints/sprints";
import {
	CHECKPOINT_DAYS_OVER_STATUSES,
	CHECKPOINT_RUNNING_STATUSES,
} from "@/lib/checkpoints/status";
import {
	type CheckpointFacts,
	checkpointFacts,
	runPeriod,
} from "@/repositories/checkpoints/ai-curator-context";
import {
	knownOnly,
	type SprintEvidence,
	sprintEvidence,
} from "@/repositories/checkpoints/call-notes";
import { journal } from "@/repositories/checkpoints/journal";
import { checkpointNumber } from "@/repositories/checkpoints/number";
import { picturesOf, takePicture } from "@/repositories/checkpoints/picture";
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
import { CONFIRMED_MEMBERS } from "@/repositories/project/team";
import type { AiPurpose } from "@/services/ai-usage";
import {
	midwayAdviceInput,
	type PlanAdviceInput,
	reviewSprint,
	type SprintReviewInput,
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
import type {
	CallNotes,
	CuratorReview,
	GoalAdvice,
	PlanAdvice,
} from "@/types/checkpoints";

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
	// Day 15 is checked once too, on the changes the author sends (GDHUB-125).
	const midway = ai && index === SCOPE_SESSION;
	if (midway && content?.checkedAt) return "alreadyChecked";
	if (start && !checkpoint.items.some((item) => !item.cut)) return "noTasks";

	const input = adviceInput(
		checkpoint,
		await checkpointFacts(
			{ ...checkpoint, id: checkpointId },
			// Halfway reads the first two sprints, a period that does not move day by day.
			checkpoint.startedAt && index !== 1
				? {
						from: checkpoint.startedAt,
						to: sprintRange(checkpoint.startedAt, 2).to,
					}
				: undefined,
		),
		index === 1 ? "start" : "midway",
		content?.notes?.inShort ?? null,
		checkpoint.curatorCharacter,
		lettersSoFar(checkpoint.sessions, session.index + 1),
	);
	const checkedAt = midway ? now.toISOString() : content?.checkedAt;
	if (content?.advice?.hash === hashOf(input)) {
		// Nothing changed since the review's advice: it already answers these tasks.
		if (midway) {
			await prisma.checkpointSession.update({
				where: { id: session.id },
				data: { content: { ...content, checkedAt } satisfies CuratorReview },
			});
		}
		return null;
	}

	const written = await adviceFor(input, checkpoint.items, checkpointId).catch(
		(error) => {
			console.error("[curator-review] plan advice failed", checkpointId, error);
			return null;
		},
	);
	if (!written) return "failed";
	// A person curating gets the goal checks in their brief, not the author (GDHUB-125).
	const shown = ai ? written : withoutGoalChecks(written);

	await prisma.checkpointSession.update({
		where: { id: session.id },
		data: {
			content: adviceContent(content, written, shown, start, checkedAt),
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

/** The session as the advice writes it; the start's letter is the advice itself, a review keeps its own. */
export const adviceContent = (
	content: CuratorReview | null,
	written: { message: string | null },
	shown: { advice: PlanAdvice; goal?: GoalAdvice | null },
	start: boolean,
	checkedAt: string | undefined,
) =>
	({
		...content,
		message: content?.notes
			? content.message
			: (written.message ?? content?.message ?? ""),
		notes: content?.notes ?? null,
		advice: shown.advice,
		goal: shown.goal ?? content?.goal,
		...(start && {
			firstLetter: content?.firstLetter ?? content?.message,
		}),
		checkedAt,
	}) satisfies CuratorReview;

/** Advice as the author reads it when a person curates: no goal checks. */
export const withoutGoalChecks = <
	T extends { advice: PlanAdvice; goal?: GoalAdvice | null },
>(
	written: T,
): T => ({
	...written,
	advice: {
		...written.advice,
		tasks: written.advice.tasks.filter((row) => row.kind !== "offGoal"),
	},
	goal: written.goal && { ...written.goal, stage: null },
});

/** What the model is given for advice on the plan — and what its hash answers. */
const adviceInput = (
	checkpoint: {
		goal: string;
		items: Parameters<typeof toCuratorTask>[0][];
	},
	facts: CheckpointFacts,
	moment: PlanAdviceInput["moment"],
	review: string | null,
	character: string | null,
	journal: JournalEntry[],
): PlanAdviceInput => ({
	goal: checkpoint.goal,
	character,
	journal,
	...facts,
	tasks: checkpoint.items.map(toCuratorTask),
	moment,
	review,
});

/** The model's advice, kept for open tasks only and none it made up. */
export const adviceFor = async (
	input: PlanAdviceInput,
	items: TaskRow[],
	checkpointId: string,
	purpose: AiPurpose = "planAdvice",
) => {
	const written = await writePlanAdvice(input, { checkpointId, purpose });
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
						status: { in: CHECKPOINT_DAYS_OVER_STATUSES },
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
 * The verdict of every AI checkpoint whose final review is written, right
 * after the reviews; one the model fails on stays in Review for the next night.
 */
export const closeDueCheckpoints = async () => {
	const due = await prisma.projectCheckpoint.findMany({
		where: {
			curatorKind: CheckpointCuratorKind.AI,
			status: CheckpointStatus.Review,
			verdict: null,
			sessions: {
				some: {
					index: FINAL_SESSION,
					contentStatus: CheckpointSessionContentStatus.Ready,
				},
			},
		},
		select: { id: true },
	});
	let closed = 0;
	for (const { id } of due) {
		const settled = await closeCheckpoint(id).catch((error) => {
			console.error("[curator-verdict] failed for checkpoint", id, error);
			return null;
		});
		if (!settled) continue;
		await notifyVerdictSent(id);
		closed += 1;
	}
	return closed;
};

/**
 * What changed in a sprint, from the picture before it to the one after it
 * (GDHUB-133). A picture not written yet is taken now; without the one before,
 * there is nothing to compare and the review reads the feed alone.
 */
const sprintChange = async (checkpointId: string, sprint: number) => {
	const pictures = await picturesOf(checkpointId);
	const before = pictures.get(sprint - 1);
	if (!before) return {};
	const after =
		pictures.get(sprint) ?? (await takePicture(checkpointId, sprint));
	return changeBetween(before, after, `the start of sprint ${sprint}`);
};

/**
 * The sprint behind a session, as the model reads it: its devlogs and what
 * their media show, its artifacts, the pulse, and the focus the last call or
 * review agreed. The final review reads the whole run; the verdict follows it.
 */
export const sprintReviewInput = async (
	checkpoint: ReviewCheckpoint,
	startedAt: Date,
	sessionIndex: number,
	final: boolean,
	/** What was seen, given instead of looking (GDHUB-156): nothing is looked at or written. */
	seen?: {
		evidence: SprintEvidence;
		devlogMedia: string[];
		artifactsSeen: string[];
	},
) => {
	const sprint = sessionIndex - 1;
	const [{ devlogs, posts, artifacts }, facts, change] = await Promise.all([
		seen?.evidence ?? sprintEvidence(checkpoint.projectId, startedAt, sprint),
		checkpointFacts(
			{ ...checkpoint, startedAt },
			final
				? runPeriod(startedAt, checkpoint.dueAt)
				: sprintRange(startedAt, sprint),
		),
		sprintChange(checkpoint.id, sprint),
	]);
	const [devlogMedia, artifactsSeen] = seen
		? [seen.devlogMedia, seen.artifactsSeen]
		: await Promise.all([
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
		...facts,
		sprint,
		tasks: checkpoint.items.map(toCuratorTask),
		devlogs,
		devlogMedia,
		artifactsSeen,
		artifacts,
		focusLastReview: agreed.map((line) => line.text),
		...change,
		lastDirection: directionOf(previous) ?? null,
		final,
	};
};

/**
 * A sprint review from its input — the compute half of `writeReviewFor`,
 * nothing written: the review, halfway the advice on the tasks, the letter.
 */
export const composeReview = async (
	checkpoint: ReviewCheckpoint,
	sessionIndex: number,
	input: SprintReviewInput,
	{
		purpose,
		hint,
		advicePurpose,
	}: {
		purpose: AiPurpose;
		hint?: string | null;
		/** What the advice inside it is charged to; the scheduled run's own by default. */
		advicePurpose?: AiPurpose;
	},
) => {
	// Halfway the tasks change for the last time.
	const advise =
		sessionIndex === SCOPE_SESSION
			? async (review: string) =>
					(
						await adviceFor(
							midwayAdviceInput(input, review),
							checkpoint.items,
							checkpoint.id,
							advicePurpose,
						)
					)?.advice ?? null
			: null;
	const review = await reviewSprint({ ...input, hint }, advise, {
		checkpointId: checkpoint.id,
		purpose,
	});
	if (!review) return null;
	return {
		message: review.message,
		notes: knownOnly(review.notes, checkpoint.items),
		advice: review.advice,
	};
};

/** One session's review, now. The daily run claims it first; a dev script calls it directly. */
export const writeReviewFor = async (sessionId: string, now: Date) => {
	const session = await prisma.checkpointSession.findUniqueOrThrow({
		where: { id: sessionId },
		select: { index: true, checkpointId: true },
	});
	const final = session.index === FINAL_SESSION;
	// A review looks first at anything missed; the final one comes before the
	// verdict, which reads its direction (GDHUB-133).
	await seeCheckpointEvidence(session.checkpointId);

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
	if (!startedAt) return false;

	const sprint = session.index - 1;
	const input = await sprintReviewInput(
		checkpoint,
		startedAt,
		session.index,
		final,
	);
	const review = await composeReview(checkpoint, session.index, input, {
		purpose: "sprintReview",
	});
	if (!review) return false;

	await prisma.checkpointSession.update({
		where: { id: sessionId },
		data: {
			content: review satisfies CuratorReview,
			contentStatus: CheckpointSessionContentStatus.Ready,
			endedAt: now,
		},
	});
	await journal({
		checkpointId: session.checkpointId,
		kind: CheckpointJournalKind.Review,
		sprint,
		input,
		output: review,
	});

	// The verdict follows in the same night run, from closeDueCheckpoints.
	if (final) return true;
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

/** A human curator's brief from its input — the compute half of `writeBriefFor`, nothing written. */
export const composeBrief = async (
	checkpoint: ReviewCheckpoint,
	sessionIndex: number,
	input: SprintReviewInput,
	{
		purpose,
		hint,
		advicePurpose,
	}: {
		purpose: AiPurpose;
		hint?: string | null;
		/** What the advice inside it is charged to; the scheduled run's own by default. */
		advicePurpose?: AiPurpose;
	},
) => {
	const checkpointId = checkpoint.id;
	const review = await writeSprintReview(
		{ ...input, hint },
		{
			checkpointId,
			purpose,
		},
	);
	if (!review) return null;
	// The plan is set on call 1 and changed on call 3: the briefs after them
	// carry the goal and each task checked against the chain (GDHUB-125).
	const planCall = sessionIndex - 1;
	const checks =
		planCall === 1 || planCall === SCOPE_SESSION
			? await adviceFor(
					{
						...midwayAdviceInput(input, review.inShort),
						moment: planCall === 1 ? "start" : "midway",
					},
					checkpoint.items,
					checkpointId,
					advicePurpose,
				).catch((error) => {
					console.error(
						"[curator-brief] goal checks failed",
						checkpointId,
						error,
					);
					return null;
				})
			: null;

	return {
		audience: "curator" as const,
		// The focus is agreed on the call, not proposed in the brief.
		notes: knownOnly({ ...review, agreed: [] }, checkpoint.items),
		// What the curator's card shows beside each task, so it never reads the input.
		seen: input.tasks.flatMap((task) =>
			task.evidence.flatMap((piece) =>
				piece.seen ? [{ itemId: task.id, ...piece.seen }] : [],
			),
		),
		goal: checks?.goal ?? null,
		advice: checks?.advice ?? null,
	};
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
	const output = await composeBrief(checkpoint, session.index, input, {
		purpose: "callBrief",
	});
	if (!output) return false;

	await journal({
		checkpointId,
		kind: CheckpointJournalKind.Review,
		sprint,
		input,
		output,
	});
	return true;
};
