import {
	CheckpointItemKind,
	type CheckpointSessionContentStatus,
	CheckpointStatus,
} from "@/config/prisma-enums";
import {
	type CallState,
	callMissed,
	callRoomName,
	callState,
	callWindow,
	type PlanEdit,
	parseCallRoomName,
	planEdit,
} from "@/lib/checkpoint-call";
import { toArtifactRef } from "@/repositories/checkpoint.repository";
import {
	checkpointNumber,
	previousVerdict,
} from "@/repositories/checkpoint-number";
import { agreeGoal, canEditPlan } from "@/repositories/checkpoint-plan-edit";
import { type CallBrief, getCallBriefs } from "@/repositories/curator-journal";
import { CONFIRMED_MEMBERS } from "@/repositories/scout.games";
import {
	callRoom,
	callToken,
	closeCallRoom,
	roomParticipantMinutes,
	startTranscriptJob,
	transcriptOfJob,
} from "@/services/daily";
import { prisma } from "@/services/prisma";
import type {
	CallNotes,
	CheckpointArtifactRef,
	CuratorReview,
	PlanAdvice,
	PreviousVerdict,
} from "@/types/checkpoints";

/** Calls are held while the checkpoint runs, the final one while it is judged. */
const CALL_STATUSES: CheckpointStatus[] = [
	CheckpointStatus.Active,
	CheckpointStatus.Review,
];

export type CallRole = "curator" | "team";

export type CheckpointCallDto = {
	/** The last checkpoint's verdict, through this one's first sprint. */
	previous: PreviousVerdict | null;
	checkpointId: string;
	index: number;
	number: number;
	stageName: string;
	project: { id: string; name: string; slug: string };
	curator: { id: string; name: string; image: string | null };
	scheduledAt: string;
	state: CallState;
	/** Its window passed and the curator never came in. */
	missed: boolean;
	curatorJoinedAt: string | null;
	role: CallRole;
	/** The curator's only: the AI's read of the sprint behind each call (GDHUB-114). */
	briefs: CallBrief[];
	plan: {
		goal: string;
		goalAgreedAt: string | null;
		/** The AI's advice on the author's draft, before call 1. */
		advice: PlanAdvice | null;
		/** What the caller may change now; null for those who only read. */
		edit: PlanEdit;
		tasks: {
			id: string;
			text: string;
			cut: boolean;
			addedAt: string | null;
			artifact: CheckpointArtifactRef | null;
		}[];
	};
	/** The five calls for the notes switcher; `held` once a call is over. */
	sessions: {
		index: number;
		scheduledAt: string;
		held: boolean;
		missed: boolean;
		contentStatus: CheckpointSessionContentStatus | null;
	}[];
};

const user = { select: { id: true, name: true, image: true } };

/**
 * The call and who is asking: its curator or someone confirmed on the team.
 * Anyone else, and a checkpoint not running, gets null.
 */
const loadCall = async (
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
			checkpoint: {
				select: {
					projectId: true,
					createdAt: true,
					startedAt: true,
					stageName: true,
					status: true,
					curator: user,
					project: {
						select: {
							name: true,
							slug: true,
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
				},
			},
		},
	});
	const checkpoint = session?.checkpoint;
	if (
		!session ||
		!checkpoint?.curator ||
		!CALL_STATUSES.includes(checkpoint.status)
	) {
		return null;
	}

	const curator = checkpoint.curator;
	if (curator.id === userId) {
		return { session, checkpoint, curator, role: "curator" as const };
	}
	if (checkpoint.project.team?.members.length) {
		return { session, checkpoint, curator, role: "team" as const };
	}
	return null;
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
		}),
	]);

	const edit = canEditPlan(plan, userId) ? planEdit(plan, now) : null;
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
		role: call.role,
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
				artifact: item.artifact ? toArtifactRef(item.artifact) : null,
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

export type CallNotesDto = {
	contentStatus: CheckpointSessionContentStatus | null;
	content: CallNotes | null;
	/** The transcript's parts joined in order; null until one is saved. */
	transcript: string | null;
};

/** A held call's notes, for its curator and its team. */
export const getCallNotes = async (
	checkpointId: string,
	index: number,
	userId: string,
): Promise<CallNotesDto | null> => {
	if (!(await loadCall(checkpointId, index, userId))) return null;

	const session = await prisma.checkpointSession.findUniqueOrThrow({
		where: { checkpointId_index: { checkpointId, index } },
		select: { contentStatus: true, content: true, transcript: true },
	});
	const parts = (session.transcript ?? []) as TranscriptPart[];

	return {
		contentStatus: session.contentStatus,
		content: (session.content as CallNotes | null) ?? null,
		transcript: parts.length
			? parts.map((part) => part.text.trim()).join("\n\n")
			: null,
	};
};

export type JoinRefusal = "notFound" | "notOpen" | "curatorNotIn";

/**
 * A token for the call's room. The team is refused until the curator has
 * joined: the gate lives here, not only in the UI. The curator's first token
 * opens the call for the team.
 */
export const joinCall = async (
	checkpointId: string,
	index: number,
	caller: { id: string; name: string },
	now = new Date(),
): Promise<{ url: string; token: string } | { refused: JoinRefusal }> => {
	const call = await loadCall(checkpointId, index, caller.id);
	if (!call) return { refused: "notFound" };
	const { session, role } = call;

	if (callState(session.scheduledAt, session.endedAt, now) !== "open") {
		return { refused: "notOpen" };
	}
	if (role === "team" && !session.curatorJoinedAt) {
		return { refused: "curatorNotIn" };
	}

	const room = callRoomName(checkpointId, index);
	const { closesAt } = callWindow(session.scheduledAt);
	const [url, token] = await Promise.all([
		callRoom(room, closesAt),
		callToken({
			room,
			userId: caller.id,
			userName: caller.name,
			curator: role === "curator",
			closesAt,
		}),
	]);

	if (role === "curator" && !session.curatorJoinedAt) {
		await prisma.checkpointSession.update({
			where: { checkpointId_index: { checkpointId, index } },
			data: { curatorJoinedAt: now },
		});
	}

	return { url, token };
};

/** The curator ends the call for everyone; false for anyone else. */
export const endCall = async (
	checkpointId: string,
	index: number,
	userId: string,
	now = new Date(),
) => {
	const call = await loadCall(checkpointId, index, userId);
	if (call?.role !== "curator") return false;

	await prisma.checkpointSession.updateMany({
		where: { checkpointId, index, endedAt: null },
		data: { endedAt: now },
	});
	await closeCallRoom(callRoomName(checkpointId, index)).catch(() => undefined);
	if (index === 1) await agreeGoal(checkpointId, now);
	return true;
};

// Daily's webhooks. A room not named for a checkpoint call is not ours.

/** Recounted from the whole room each time, so a redelivered event adds nothing. */
export const recordMeetingEnded = async (room: string, endedAt: Date) => {
	const call = parseCallRoomName(room);
	if (!call) return;
	const where = { checkpointId_index: call };

	const session = await prisma.checkpointSession.findUnique({
		where,
		select: { endedAt: true },
	});
	if (!session) return;

	await prisma.checkpointSession.update({
		where,
		data: {
			endedAt: session.endedAt ?? endedAt,
			participantMinutes: await roomParticipantMinutes(room),
		},
	});
	if (call.index === 1) await agreeGoal(call.checkpointId, endedAt);
};

export const transcribeRecording = async (
	room: string,
	recordingId: string,
) => {
	if (!parseCallRoomName(room)) return;
	await startTranscriptJob(recordingId);
};

type TranscriptPart = { recordingId: string; startedAt: string; text: string };

/** Each recording of the call adds its part, once, in the order they were made. */
export const saveTranscript = async (jobId: string) => {
	const part = await transcriptOfJob(jobId);
	const call = part && parseCallRoomName(part.room);
	if (!part || !call) return;
	const where = { checkpointId_index: call };

	const session = await prisma.checkpointSession.findUnique({
		where,
		select: { transcript: true },
	});
	if (!session) return;

	const parts = (session.transcript ?? []) as TranscriptPart[];
	if (parts.some((saved) => saved.recordingId === part.recordingId)) return;

	const next: TranscriptPart[] = [
		...parts,
		{
			recordingId: part.recordingId,
			startedAt: part.startedAt,
			text: part.text,
		},
	].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
	await prisma.checkpointSession.update({ where, data: { transcript: next } });
};
