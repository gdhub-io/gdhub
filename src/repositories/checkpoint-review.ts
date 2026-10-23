import { createHash } from "node:crypto";
import { FINAL_SESSION, SCOPE_SESSION } from "@/config/checkpoint";
import {
	CheckpointCuratorKind,
	CheckpointItemKind,
	CheckpointSessionContentStatus,
	CheckpointStatus,
	type CheckpointVerdict,
} from "@/config/prisma-enums";
import {
	aiPlanCloses,
	type PlanEdit,
	planEdit,
	planSession,
} from "@/lib/checkpoint-call";
import { scopeWindow } from "@/lib/checkpoint-scope";
import { sprintRange } from "@/lib/checkpoint-sprints";
import { toArtifactRef } from "@/repositories/checkpoint.repository";
import {
	knownOnly,
	sprintEvidence,
} from "@/repositories/checkpoint-call-notes";
import { closeCheckpoint } from "@/repositories/checkpoint-curator.repository";
import {
	checkpointNumber,
	previousVerdict,
} from "@/repositories/checkpoint-number";
import { canEditPlan } from "@/repositories/checkpoint-plan-edit";
import { projectPicture, runPeriod } from "@/repositories/curator-context";
import {
	describeDevlogMedia,
	SPRINT_VIDEO_SECONDS,
	seeCheckpointEvidence,
} from "@/repositories/evidence-seen";
import { CONFIRMED_MEMBERS } from "@/repositories/scout.games";
import { toCuratorTask } from "@/services/call-notes";
import {
	notify,
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
			startedAt: true,
			dueAt: true,
			verdict: true,
			verdictNote: true,
			project: {
				select: {
					name: true,
					slug: true,
					authorId: true,
					workflow: { select: { currentStepId: true } },
					team: {
						select: {
							members: {
								where: { ...CONFIRMED_MEMBERS, userId },
								select: { id: true },
							},
						},
					},
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
	const { project } = checkpoint;
	if (project.authorId !== userId && !project.team?.members.length) return null;
	const current =
		checkpoint.sessions.filter((row) => row.scheduledAt <= now).at(-1)?.index ??
		1;

	const edit = canEditPlan({ ...checkpoint, project }, userId)
		? planEdit(checkpoint, now)
		: null;

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
				editUntil(
					edit,
					checkpoint.startedAt,
					checkpoint.sessions,
				)?.toISOString() ?? null,
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
	startedAt: Date,
	sessions: { index: number; scheduledAt: Date; endedAt: Date | null }[],
) => {
	if (edit === "plan") return aiPlanCloses(startedAt);
	if (edit === "tasks") return scopeWindow(startedAt, sessions).closes;
	return null;
};

export type AdviceRefusal = "notFound" | "forbidden" | "planClosed" | "failed";

/**
 * The AI's read of the tasks as saved, written on the session the plan is open
 * on — the AI curator's start and day 15, or a pro checkpoint's draft before
 * call 1. The same plan is not read twice: the answer is kept with the
 * hash of what it answered.
 */
export const adviseOnPlan = async (
	checkpointId: string,
	userId: string,
	now = new Date(),
): Promise<AdviceRefusal | null> => {
	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id: checkpointId },
		select: {
			curatorId: true,
			curatorKind: true,
			goal: true,
			goalAgreedAt: true,
			stageName: true,
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
	const input = adviceInput(
		checkpoint,
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
				message: content?.notes ? content.message : written.message,
				notes: content?.notes ?? null,
				advice: written.advice,
			} satisfies CuratorReview,
			// With a pro curator the session stays unwritten: call 1's notes
			// claim it by a null status, and they replace this draft advice.
			...(ai && { contentStatus: CheckpointSessionContentStatus.Ready }),
		},
	});
	return null;
};

/** What the model is given for advice on the plan — and what its hash answers. */
const adviceInput = (
	checkpoint: {
		goal: string;
		stageName: string;
		items: Parameters<typeof toCuratorTask>[0][];
	},
	moment: PlanAdviceInput["moment"],
	review: string | null,
	picture: string,
): PlanAdviceInput => ({
	goal: checkpoint.goal,
	stage: checkpoint.stageName,
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
	return { message: written.message, advice };
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

/** One session's review, now. The daily run claims it first; a dev script calls it directly. */
export const writeReviewFor = async (sessionId: string, now: Date) => {
	const session = await prisma.checkpointSession.findUniqueOrThrow({
		where: { id: sessionId },
		select: { index: true, checkpointId: true },
	});
	const final = session.index === FINAL_SESSION;
	// The verdict comes first, so the last letter can agree with it; it looks at
	// the evidence itself. A sprint review looks at it first, on the sprint's budget.
	if (final) await closeCheckpoint(session.checkpointId);
	// The final review's video budget went on the evidence the verdict read.
	const videoUsed = final
		? SPRINT_VIDEO_SECONDS
		: await seeCheckpointEvidence(session.checkpointId);

	const checkpoint = await prisma.projectCheckpoint.findUniqueOrThrow({
		where: { id: session.checkpointId },
		select: {
			id: true,
			projectId: true,
			createdAt: true,
			goal: true,
			stageName: true,
			startedAt: true,
			dueAt: true,
			verdict: true,
			verdictNote: true,
			items: taskSelect,
			sessions: { select: { index: true, content: true } },
			pulses: { select: { week: true, confirmedAt: true } },
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
	if (!checkpoint.startedAt || (final && !checkpoint.verdict)) return false;

	const sprint = session.index - 1;
	const [{ devlogs, posts, artifacts }, picture] = await Promise.all([
		sprintEvidence(checkpoint.projectId, checkpoint.startedAt, sprint),
		projectPicture(
			session.checkpointId,
			final
				? runPeriod(checkpoint.startedAt, checkpoint.dueAt)
				: sprintRange(checkpoint.startedAt, sprint),
		),
	]);
	const devlogMedia = await describeDevlogMedia(
		session.checkpointId,
		posts,
		SPRINT_VIDEO_SECONDS - videoUsed,
	);
	const pulses = checkpoint.pulses.filter((pulse) => pulse.week === sprint);
	const previous = checkpoint.sessions.find(
		(row) => row.index === session.index - 1,
	)?.content as CuratorReview | null | undefined;

	const review = await writeSprintReview(
		{
			goal: checkpoint.goal,
			stage: checkpoint.stageName,
			sprint,
			tasks: checkpoint.items.map(toCuratorTask),
			devlogs,
			devlogMedia,
			artifacts,
			pulse: {
				worked: pulses.filter((pulse) => pulse.confirmedAt).length,
				missing: pulses.filter((pulse) => !pulse.confirmedAt).length,
			},
			focusLastReview: previous?.notes?.agreed.map((line) => line.text) ?? [],
			verdict: checkpoint.verdict
				? { verdict: checkpoint.verdict, note: checkpoint.verdictNote ?? "" }
				: null,
			picture,
		},
		{ checkpointId: session.checkpointId, purpose: "sprintReview" },
	);
	if (!review) return false;

	const notes = knownOnly(review.notes, checkpoint.items);
	// Halfway the tasks change for the last time: the advice comes with the review.
	const midway =
		session.index === SCOPE_SESSION
			? await adviceFor(
					adviceInput(checkpoint, "midway", notes.inShort, picture),
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
						? "What the sprint showed, the focus for the next one, and the curator's advice on the tasks — they can change until tomorrow."
						: "What the sprint showed and the focus for the next one.",
				redirectUrl: reviewUrl(checkpoint.project.slug, number, session.index),
			}),
		),
	);
	return true;
};
