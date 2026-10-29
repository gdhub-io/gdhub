import {
	callRoomName,
	callState,
	callWindow,
	parseCallRoomName,
} from "@/lib/checkpoints/call";
import { memberRole } from "@/repositories/checkpoints/ai-curator-context";
import {
	type JoinRefusal,
	loadCall,
	type TranscriptPart,
	user,
} from "@/repositories/checkpoints/call";
import { agreeGoal } from "@/repositories/checkpoints/plan-edit";
import { CONFIRMED_MEMBERS } from "@/repositories/scout/games";
import {
	callRoom,
	callToken,
	closeCallRoom,
	roomParticipants,
	roomPresence,
	startTranscriptJob,
	transcriptOfJob,
} from "@/services/daily";
import { prisma } from "@/services/prisma";
import type { CallPresenceDto } from "@/types/checkpoint-call";

/**
 * The people of a call, the curator first, and who is in its room right now
 * (12.08.3). The room is only asked while it is open.
 */
export const getCallPresence = async (
	checkpointId: string,
	index: number,
	userId: string,
	now = new Date(),
): Promise<CallPresenceDto | null> => {
	const call = await loadCall(checkpointId, index, userId);
	if (!call) return null;
	const { session, checkpoint, curator } = call;

	const [members, inRoom] = await Promise.all([
		prisma.teamMember.findMany({
			where: {
				team: { projectId: checkpoint.projectId },
				...CONFIRMED_MEMBERS,
			},
			orderBy: { startedAt: "asc" },
			select: {
				position: true,
				speciality: { select: { name: true } },
				user,
			},
		}),
		callState(session.scheduledAt, session.endedAt, now) === "open"
			? roomPresence(callRoomName(checkpointId, index))
			: ([] as string[]),
	]);

	const person = (
		who: { id: string; name: string | null; image: string | null },
		role: string | null,
	) => ({
		id: who.id,
		name: who.name ?? "",
		image: who.image,
		role,
		inCall: inRoom.includes(who.id),
	});

	return {
		people: [
			person(curator, "curator"),
			...members.map((member) =>
				person(
					member.user,
					member.user.id === checkpoint.project.authorId
						? "author"
						: memberRole(member, "") || null,
				),
			),
		],
	};
};

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

	const { minutes, userIds } = await roomParticipants(room);
	await prisma.checkpointSession.update({
		where,
		data: {
			endedAt: session.endedAt ?? endedAt,
			participantMinutes: minutes,
			attendeeIds: userIds,
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
