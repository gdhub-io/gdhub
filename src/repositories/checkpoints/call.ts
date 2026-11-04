import { FINAL_SESSION } from "@/config/checkpoint";
import {
	CheckpointItemKind,
	CheckpointSessionContentStatus,
} from "@/config/prisma-enums";
import {
	callMissed,
	callState,
	directionOpen,
	isMovable,
	planEdit,
} from "@/lib/checkpoints/call";
import { currentSessionOf } from "@/lib/checkpoints/sessions";
import { isRunning } from "@/lib/checkpoints/status";
import { toArtifactRef } from "@/repositories/checkpoints/detail";
import { getCallBriefs } from "@/repositories/checkpoints/journal";
import {
	checkpointNumber,
	previousVerdict,
} from "@/repositories/checkpoints/number";
import {
	canEditPlan,
	viewerOf,
	viewerSelect,
} from "@/repositories/checkpoints/viewer";
import { prisma } from "@/services/prisma";
import type {
	CallNotesDto,
	CallRole,
	CheckpointCallDto,
} from "@/types/checkpoint-call";
import type {
	CallNotes,
	CuratorReview,
	SprintDirection,
} from "@/types/checkpoints";
export const user = { select: { id: true, name: true, image: true } };

/**
 * The call and who is asking: its curator, or the author or someone confirmed
 * on the team.
 * Anyone else, and a checkpoint not running, gets null.
 */
export const loadCall = async (
	checkpointId: string,
	index: number,
	userId: string,
) => {
	const session = await prisma.checkpointSession.findUnique({
		where: { checkpointId_index: { checkpointId, index } },
		select: {
			scheduledAt: true,
			curatorJoinedAt: true,
			endedAt: true,
			moveTo: true,
			moveAskedById: true,
			moveAskedBy: { select: { name: true } },
			checkpoint: {
				select: {
					curatorKind: true,
					projectId: true,
					createdAt: true,
					startedAt: true,
					stageName: true,
					status: true,
					curator: user,
					curatorId: true,
					project: {
						select: {
							...viewerSelect(userId).project.select,
							name: true,
							slug: true,
						},
					},
				},
			},
		},
	});
	const checkpoint = session?.checkpoint;
	if (!session || !checkpoint?.curator || !isRunning(checkpoint.status)) {
		return null;
	}

	const viewer = viewerOf(checkpoint, userId);
	if (!viewer) return null;
	const role: CallRole = viewer === "curator" ? "curator" : "team";
	return { session, checkpoint, curator: checkpoint.curator, role };
};

export const getCall = async (
	checkpointId: string,
	index: number,
	userId: string,
	now = new Date(),
): Promise<CheckpointCallDto | null> => {
	const call = await loadCall(checkpointId, index, userId);
	if (!call) return null;
	const { session, checkpoint, curator } = call;

	const [number, previous, briefs, plan] = await Promise.all([
		checkpointNumber(checkpoint),
		previousVerdict(checkpoint, now),
		call.role === "curator" ? getCallBriefs(checkpointId) : [],
		prisma.projectCheckpoint.findUniqueOrThrow({
			where: { id: checkpointId },
			select: {
				curatorId: true,
				curatorKind: true,
				goal: true,
				goalAgreedAt: true,
				startedAt: true,
				project: { select: { authorId: true } },
				sessions: {
					orderBy: { index: "asc" },
					select: {
						index: true,
						scheduledAt: true,
						curatorJoinedAt: true,
						endedAt: true,
						contentStatus: true,
						content: true,
					},
				},
				items: {
					where: { kind: CheckpointItemKind.Outcome },
					orderBy: { order: "asc" },
					select: {
						id: true,
						text: true,
						cut: true,
						addedAt: true,
						evidence: {
							orderBy: { createdAt: "asc" },
							select: {
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
						},
					},
				},
			},
		}),
	]);

	const edit = canEditPlan(plan, userId) ? planEdit(plan, now) : null;
	// Past its room's opening a call no longer moves, and a request lapses.
	const movable = isMovable(session, checkpoint, now);
	// The draft advice lives on session 1 until call 1's notes replace it.
	const draft =
		edit === "plan" && !plan.sessions[0]?.contentStatus
			? ((plan.sessions[0]?.content as CuratorReview | null)?.advice ?? null)
			: null;

	return {
		checkpointId,
		index,
		number,
		previous,
		stageName: checkpoint.stageName,
		project: {
			id: checkpoint.projectId,
			name: checkpoint.project.name,
			slug: checkpoint.project.slug,
		},
		curator: { id: curator.id, name: curator.name ?? "", image: curator.image },
		scheduledAt: session.scheduledAt.toISOString(),
		state: callState(session.scheduledAt, session.endedAt, now),
		missed: callMissed(session, now),
		curatorJoinedAt: session.curatorJoinedAt?.toISOString() ?? null,
		canMove: movable && canEditPlan(checkpoint, userId),
		move:
			movable && session.moveTo && session.moveAskedById
				? {
						to: session.moveTo.toISOString(),
						mine: session.moveAskedById === userId,
						askerName: session.moveAskedBy?.name ?? "",
					}
				: null,
		role: call.role,
		current: currentSessionOf(plan.sessions, now),
		briefs,
		plan: {
			goal: plan.goal,
			goalAgreedAt: plan.goalAgreedAt?.toISOString() ?? null,
			advice: draft,
			edit,
			tasks: plan.items.map((item) => ({
				id: item.id,
				text: item.text,
				cut: item.cut,
				addedAt: item.addedAt?.toISOString() ?? null,
				artifacts: item.evidence.map(({ artifact }) => toArtifactRef(artifact)),
			})),
		},
		sessions: plan.sessions.map((row) => ({
			index: row.index,
			scheduledAt: row.scheduledAt.toISOString(),
			held: callState(row.scheduledAt, row.endedAt, now) === "over",
			missed: callMissed(row, now),
			contentStatus: row.contentStatus,
		})),
	};
};

/** A held call's notes, for its curator and its team. */
export const getCallNotes = async (
	checkpointId: string,
	index: number,
	userId: string,
): Promise<CallNotesDto | null> => {
	const call = await loadCall(checkpointId, index, userId);
	if (!call) return null;

	const session = await prisma.checkpointSession.findUniqueOrThrow({
		where: { checkpointId_index: { checkpointId, index } },
		select: { contentStatus: true, content: true, transcript: true },
	});
	const parts = (session.transcript ?? []) as TranscriptPart[];
	const content = (session.content as CallNotes | null) ?? null;
	// The team reads the direction only once the curator has confirmed it.
	const hidden =
		call.role === "team" &&
		content?.direction &&
		!content.direction.confirmedAt;

	return {
		contentStatus: session.contentStatus,
		content: hidden ? { ...content, direction: undefined } : content,
		transcript: parts.length
			? parts.map((part) => part.text.trim()).join("\n\n")
			: null,
	};
};

export type JoinRefusal = "notFound" | "notOpen" | "curatorNotIn";

export type TranscriptPart = {
	recordingId: string;
	startedAt: string;
	text: string;
};

/** The direction the AI's brief proposed for a sprint: the preset the curator confirms or changes. */
export const briefDirection = async (checkpointId: string, sprint: number) =>
	(await getCallBriefs(checkpointId)).findLast(
		(brief) => brief.index === sprint + 1,
	)?.notes?.direction;

/**
 * The human curator's word on a sprint's direction, after its call; it may be
 * changed until the final call starts. Null when it is not theirs to set now.
 */
export const confirmDirection = async (
	checkpointId: string,
	index: number,
	userId: string,
	direction: Pick<SprintDirection, "goal" | "stage">,
	now = new Date(),
) => {
	const call = await loadCall(checkpointId, index, userId);
	if (!call || call.role !== "curator") return null;
	const sessions = await prisma.checkpointSession.findMany({
		where: { checkpointId, index: { in: [index, FINAL_SESSION] } },
		select: {
			index: true,
			content: true,
			contentStatus: true,
			scheduledAt: true,
		},
	});
	const session = sessions.find((row) => row.index === index);
	if (
		!session?.content ||
		session.contentStatus !== CheckpointSessionContentStatus.Ready ||
		!directionOpen(sessions, index, now)
	)
		return null;

	const content = {
		...(session.content as CallNotes),
		direction: { ...direction, confirmedAt: now.toISOString() },
	};
	await prisma.checkpointSession.update({
		where: { checkpointId_index: { checkpointId, index } },
		data: { content },
	});
	return content.direction;
};
