import { createHash } from "node:crypto";
import type { Prisma } from "@gdhub-io/gdhub-prisma";
import {
	CHECKPOINT_RUNNING_STATUSES,
	FINAL_SESSION,
	SCOPE_SESSION,
} from "@/config/checkpoint";
import {
	CheckpointCuratorKind,
	CheckpointItemKind,
	CheckpointJournalKind,
	CheckpointSessionContentStatus,
	CheckpointStatus,
	type CheckpointVerdict,
} from "@/config/prisma-enums";
import {
	type PlanEdit,
	planCloses,
	planEdit,
	planSession,
} from "@/lib/checkpoint-call";
import { MS_PER_DAY, sessionDay } from "@/lib/checkpoint-days";
import { scopeWindow } from "@/lib/checkpoint-scope";
import { currentSessionOf } from "@/lib/checkpoint-sessions";
import { sprintRange } from "@/lib/checkpoint-sprints";
import { lettersSoFar } from "@/lib/curator-letters";
import { type CuratorNow, curatorNow } from "@/lib/curator-now";
import { toArtifactRef } from "@/repositories/checkpoint.repository";
import {
	knownOnly,
	sprintEvidence,
} from "@/repositories/checkpoint-call-notes";
import {
	closeCheckpoint,
	writeFirstLetter,
} from "@/repositories/checkpoint-curator.repository";
import {
	checkpointNumber,
	previousVerdict,
} from "@/repositories/checkpoint-number";
import {
	canEditPlan,
	viewerOf,
	viewerSelect,
} from "@/repositories/checkpoint-viewer";
import {
	curatorTeam,
	projectPicture,
	runPeriod,
	stageWorkflow,
} from "@/repositories/curator-context";
import { journal } from "@/repositories/curator-journal";
import {
	devlogMediaLines,
	seeCheckpointEvidence,
	sprintArtifactLines,
} from "@/repositories/evidence-seen";
import { CONFIRMED_MEMBERS } from "@/repositories/scout.games";
import { toCuratorTask } from "@/services/call-notes";
import type { JournalEntry } from "@/services/checkpoint-curator/prompts/card";
import { characterFace } from "@/services/checkpoint-curator/prompts/card";
import type {
	CuratorTeam,
	CuratorWorkflow,
} from "@/services/checkpoint-curator/types";
import {
	notify,
	notifyPlanChecked,
	recipient,
	reviewUrl,
} from "@/services/checkpoint-notifications";
import { notifyVerdictSent } from "@/services/checkpoint-verdict-notifications";
import {
	type PlanAdviceInput,
	writePlanAdvice,
	writeSprintReview,
} from "@/services/curator-review";
import { prisma } from "@/services/prisma";
import type {
	CallNotes,
	CheckpointArtifactRef,
	CuratorReview,
	PlanAdvice,
	PreviousVerdict,
} from "@/types/checkpoints";

/** The AI curator's pages stay readable after the verdict. */
const REVIEW_STATUSES: CheckpointStatus[] = [
	CheckpointStatus.Active,
	CheckpointStatus.Review,
	CheckpointStatus.Closed,
];

export type CheckpointReviewDto = {
	/** The last checkpoint's verdict, through this one's first sprint. */
	previous: PreviousVerdict | null;
	/** The session the checkpoint is at now: the last one whose day has come. */
	current: number;
	/** What the AI curator says now, and what it waits for (GDHUB-117). */
	curatorNow: CuratorNow;
	number: number;
	stageName: string;
	startedAt: string;
	dueAt: string;
	project: { id: string; name: string; slug: string };
	plan: {
		goal: string;
		/** What the viewer may change now; null for those who only read. */
		edit: PlanEdit;
		/** Until when `edit` holds. */
		editUntil: string | null;
		/** The AI curator has read the tasks the author sent: its one check of day 1. */
		checked: boolean;
		/** The goal and tasks agreed: approved on the AI curator's day 1, on call 1 with a pro one. */
		approved: boolean;
		tasks: {
			id: string;
			text: string;
			cut: boolean;
			addedAt: string | null;
			artifact: CheckpointArtifactRef | null;
		}[];
	};
	sessions: {
		index: number;
		scheduledAt: string;
		contentStatus: CheckpointSessionContentStatus | null;
		content: CuratorReview | null;
	}[];
	verdict: { verdict: CheckpointVerdict; note: string | null } | null;
	/** The stage a "Ready for the next stage" verdict opens, while the project is still on this one. */
	nextStage: { name: string; key: string } | null;
	/** Who the AI curator plays on this checkpoint — its name and avatar. */
	character: { name: string; avatar: string | null } | null;
};

const taskSelect = {
	where: { kind: CheckpointItemKind.Outcome },
	orderBy: { order: "asc" },
	select: {
		id: true,
		text: true,
		cut: true,
		addedAt: true,
		originalText: true,
		evidenceMatch: true,
		evidenceMatchNote: true,
		artifact: {
			select: {
				id: true,
				name: true,
				type: true,
				link: true,
				checkStatus: true,
			},
		},
	},
} as const;

type TaskRow = {
	id: string;
	cut: boolean;
	artifact: unknown;
};

/** What a stored advice answers: everything the model is given. */
const hashOf = ({ picture: _, ...input }: PlanAdviceInput) =>
	// The picture informs the read; the same plan is not read twice for it.
	createHash("sha256")
		.update(JSON.stringify(input))
		.digest("hex");

/** Which page a checkpoint's Curator's Review shows; null for none. */
export const curatorKindOf = async (checkpointId: string) =>
	(
		await prisma.projectCheckpoint.findUnique({
			where: { id: checkpointId },
			select: { curatorKind: true },
		})
	)?.curatorKind ?? null;

/** The session Path to Checkpoint opens on without a sprint asked for. */
export const currentSessionIndex = async (
	checkpointId: string,
	now = new Date(),
) =>
	currentSessionOf(
		await prisma.checkpointSession.findMany({
			where: { checkpointId },
			select: { index: true, scheduledAt: true },
		}),
		now,
	);

/**
 * An AI checkpoint's Curator's Review, all five sessions, for its team. Anyone
 * else, and a checkpoint with a person as curator, gets null.
 */
export const getReview = async (
	checkpointId: string,
	userId: string,
	now = new Date(),
): Promise<CheckpointReviewDto | null> => {
	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id: checkpointId },
		select: {
			projectId: true,
			createdAt: true,
			curatorId: true,
			curatorKind: true,
			status: true,
			stageName: true,
			stepId: true,
			goal: true,
			goalAgreedAt: true,
			planCheckedAt: true,
			scopeConfirmedAt: true,
			curatorCharacter: true,
			startedAt: true,
			dueAt: true,
			verdict: true,
			verdictNote: true,
			project: {
				select: {
					...viewerSelect(userId).project.select,
					name: true,
					slug: true,
					workflow: { select: { currentStepId: true } },
				},
			},
			step: {
				select: {
					order: true,
					projectWorkflow: { select: { id: true, title: true } },
				},
			},
			sessions: {
				orderBy: { index: "asc" },
				select: {
					index: true,
					scheduledAt: true,
					endedAt: true,
					contentStatus: true,
					content: true,
				},
			},
			items: taskSelect,
		},
	});
	if (
		!checkpoint?.startedAt ||
		!checkpoint.dueAt ||
		checkpoint.curatorKind !== CheckpointCuratorKind.AI ||
		!REVIEW_STATUSES.includes(checkpoint.status)
	) {
		return null;
	}
	const viewer = viewerOf(checkpoint, userId);
	if (!viewer) return null;
	const { project } = checkpoint;
	const current = currentSessionOf(checkpoint.sessions, now);
	const edit = viewer === "team" ? null : planEdit(checkpoint, now);

	const stillOnStage =
		!!checkpoint.stepId &&
		project.workflow?.currentStepId === checkpoint.stepId;
	const [number, previous, next] = await Promise.all([
		checkpointNumber(checkpoint),
		previousVerdict(checkpoint, now),
		stillOnStage && checkpoint.step
			? prisma.projectWorkflowStep.findFirst({
					where: {
						projectWorkflowId: checkpoint.step.projectWorkflow.id,
						order: { gt: checkpoint.step.order },
					},
					orderBy: { order: "asc" },
					select: { order: true, name: true },
				})
			: null,
	]);

	return {
		current,
		curatorNow: curatorNow(
			{ ...checkpoint, startedAt: checkpoint.startedAt },
			now,
		),
		number,
		previous,
		stageName: checkpoint.stageName,
		startedAt: checkpoint.startedAt.toISOString(),
		dueAt: checkpoint.dueAt.toISOString(),
		project: {
			id: checkpoint.projectId,
			name: project.name,
			slug: project.slug,
		},
		plan: {
			goal: checkpoint.goal,
			edit,
			editUntil:
				editUntil(edit, {
					...checkpoint,
					startedAt: checkpoint.startedAt,
				})?.toISOString() ?? null,
			checked: !!checkpoint.planCheckedAt,
			approved: !!checkpoint.goalAgreedAt,
			tasks: checkpoint.items.map((item) => ({
				id: item.id,
				text: item.text,
				cut: item.cut,
				addedAt: item.addedAt?.toISOString() ?? null,
				artifact: item.artifact ? toArtifactRef(item.artifact) : null,
			})),
		},
		sessions: checkpoint.sessions.map((row) => ({
			index: row.index,
			scheduledAt: row.scheduledAt.toISOString(),
			contentStatus: row.contentStatus,
			content: (row.content as CuratorReview | null) ?? null,
		})),
		verdict: checkpoint.verdict
			? { verdict: checkpoint.verdict, note: checkpoint.verdictNote }
			: null,
		character: characterFace(checkpoint.curatorCharacter),
		nextStage: next
			? {
					name: next.name ?? "",
					key: `workflow.${checkpoint.step?.projectWorkflow.title}.step${next.order + 1}.name`,
				}
			: null,
	};
};

const editUntil = (
	edit: PlanEdit,
	checkpoint: Parameters<typeof planCloses>[0] & {
		startedAt: Date;
		sessions: { index: number; scheduledAt: Date; endedAt: Date | null }[];
	},
) => {
	if (edit === "goalAndTasks") return planCloses(checkpoint);
	if (edit === "tasks") {
		return scopeWindow(
			checkpoint.startedAt,
			checkpoint.sessions,
			checkpoint.curatorKind,
		).closes;
	}
	return null;
};

export type AdviceRefusal =
	| "notFound"
	| "forbidden"
	| "planClosed"
	| "alreadyChecked"
	| "noTasks"
	| "failed";

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
		await curatorTeam(checkpointId, checkpoint.projectId),
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
		items.filter((item) => !item.cut && !item.artifact).map((item) => item.id),
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

/** What a sprint review reads, for the AI curator's review and the human curator's brief alike. */
const reviewSelect = {
	id: true,
	projectId: true,
	goal: true,
	stageName: true,
	stepId: true,
	startedAt: true,
	dueAt: true,
	verdict: true,
	verdictNote: true,
	curatorCharacter: true,
	items: taskSelect,
	sessions: { select: { index: true, content: true } },
} as const;

type ReviewCheckpoint = Prisma.ProjectCheckpointGetPayload<{
	select: typeof reviewSelect;
}>;

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
			curatorTeam(checkpoint.id, checkpoint.projectId),
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
	const review = await writeSprintReview(input, {
		checkpointId: session.checkpointId,
		purpose: "sprintReview",
	});
	if (!review) return false;

	const notes = knownOnly(review.notes, checkpoint.items);
	// Halfway the tasks change for the last time: the advice comes with the review.
	const midway =
		session.index === SCOPE_SESSION
			? await adviceFor(
					adviceInput(
						checkpoint,
						input.workflow,
						input.team,
						"midway",
						notes.inShort,
						input.picture,
						input.character ?? null,
						[
							...(input.journal ?? []),
							{ day: sessionDay(session.index), text: review.message },
						],
					),
					checkpoint.items,
					session.checkpointId,
				).catch(() => null)
			: null;

	await prisma.checkpointSession.update({
		where: { id: sessionId },
		data: {
			content: {
				message: review.message,
				notes,
				advice: midway?.advice ?? null,
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
		output: { message: review.message, notes, advice: midway?.advice ?? null },
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

/** A human curator's call starting within this window gets its brief on tonight's run. */
const BRIEF_AHEAD_MS = MS_PER_DAY;

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
			scheduledAt: { gt: now, lte: new Date(now.getTime() + BRIEF_AHEAD_MS) },
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
			notes: knownOnly(review.notes, checkpoint.items),
			// What the curator's card shows beside each task, so it never reads the input.
			seen: input.tasks.flatMap((task) =>
				task.seen ? [{ itemId: task.id, ...task.seen }] : [],
			),
		},
	});
	return true;
};
