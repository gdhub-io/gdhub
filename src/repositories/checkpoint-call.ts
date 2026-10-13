import { CheckpointStatus } from "@/config/prisma-enums";
import {
	type CallState,
	callRoomName,
	callState,
	callWindow,
	parseCallRoomName,
} from "@/lib/checkpoint-call";
import { checkpointNumber } from "@/repositories/checkpoint-number";
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

/** Calls are held while the checkpoint runs, the final one while it is judged. */
const CALL_STATUSES: CheckpointStatus[] = [
	CheckpointStatus.Active,
	CheckpointStatus.Review,
];

export type CallRole = "curator" | "team";

export type CheckpointCallDto = {
	checkpointId: string;
	index: number;
	number: number;
	stageName: string;
	project: { name: string; slug: string };
	curator: { id: string; name: string; image: string | null };
	scheduledAt: string;
	opensAt: string;
	state: CallState;
	curatorJoinedAt: string | null;
	role: CallRole;
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

	return {
		checkpointId,
		index,
		number: await checkpointNumber(checkpoint),
		stageName: checkpoint.stageName,
		project: { name: checkpoint.project.name, slug: checkpoint.project.slug },
		curator: { id: curator.id, name: curator.name ?? "", image: curator.image },
		scheduledAt: session.scheduledAt.toISOString(),
		opensAt: callWindow(session.scheduledAt).opensAt.toISOString(),
		state: callState(session.scheduledAt, session.endedAt, now),
		curatorJoinedAt: session.curatorJoinedAt?.toISOString() ?? null,
		role: call.role,
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
