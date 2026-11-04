import {
	ChatRoomKind,
	ChatRoomStatus,
	type Prisma,
	TeamVacancyStatus,
} from "@gdhub-io/gdhub-prisma";
import { inviteUserToRoom, makeRoomWritable } from "@/services/matrix/admin";
import { prisma } from "@/services/prisma";
import { type EnsureChatRoomResult, ensureChatRoom } from "./ensure-room";
import { vacancyChatDirectKey } from "./vacancy-keys";

type EnsureVacancyOfferChatArgs = {
	vacancyId: string;
	candidateUserId: string;
	/** Who starts the chat — must be the candidate or the project author. */
	initiatorUserId: string;
	applicationId?: string;
	firstMessage?: string;
	/**
	 * Talent-pool offer note stored in the room context, so the invitee can read
	 * it on the invite screen BEFORE joining (Matrix hides the timeline until
	 * they accept).
	 */
	offerMessage?: string;
	/** Join the invitee immediately (no invite screen) — for applied candidates. */
	autoJoinInvitees?: boolean;
	/**
	 * Allow reopening an existing Closed room. Only for an active application or
	 * an explicit new offer — a bare "open chat" must not resurrect a chat that
	 * reject/hire just closed.
	 */
	allowReopen?: boolean;
};

export type EnsureVacancyOfferChatResult = EnsureChatRoomResult & {
	inviteeUserId: string;
	/** A fresh invite was sent because the invitee had previously left. */
	reinvited: boolean;
};

/**
 * Provision the 1:1 vacancy chat (candidate ↔ project author) on the ChatRoom
 * registry. The initiator invites the other party. Idempotent per
 * (vacancy, candidate) via the directKey.
 */
export async function ensureVacancyOfferChat(
	args: EnsureVacancyOfferChatArgs,
): Promise<EnsureVacancyOfferChatResult> {
	const { vacancyId, candidateUserId, initiatorUserId, applicationId } = args;

	const vacancy = await prisma.teamVacancy.findUnique({
		where: { id: vacancyId },
		select: {
			id: true,
			title: true,
			status: true,
			team: {
				select: {
					project: {
						select: { name: true, coverImage: true, authorId: true },
					},
				},
			},
		},
	});

	const authorId = vacancy?.team?.project?.authorId;
	if (!vacancy || !authorId) {
		throw new Error("Vacancy or project author not found");
	}

	// Participants are always the candidate and the project author.
	let inviteeUserId: string;
	if (initiatorUserId === candidateUserId) {
		inviteeUserId = authorId;
	} else if (initiatorUserId === authorId) {
		inviteeUserId = candidateUserId;
	} else {
		throw new Error("Initiator must be the candidate or the project author");
	}

	const result = await ensureChatRoom({
		kind: ChatRoomKind.VacancyOffer,
		directKey: vacancyChatDirectKey(vacancyId, candidateUserId),
		title: vacancy.title,
		topic: vacancy.team?.project?.name || undefined,
		isDirect: true,
		context: {
			vacancyId,
			candidateUserId,
			applicationId: applicationId ?? null,
			offerMessage: args.offerMessage ?? null,
		},
		initiatorUserId,
		inviteeUserIds: [inviteeUserId],
		avatarUrl: vacancy.team?.project?.coverImage || undefined,
		firstMessage: args.firstMessage,
		autoJoinInvitees: args.autoJoinInvitees,
	});

	let reinvited = false;
	if (!result.created) {
		const row = await prisma.chatRoom.findUnique({
			where: { id: result.chatRoomId },
			select: { status: true, context: true },
		});
		let isOpen = row?.status === ChatRoomStatus.Open;

		// ensureChatRoom writes context only on creation. Refresh the offer note
		// on the existing row so the invitee reads the LATEST offer on the invite
		// (pending) screen — before they accept.
		if (args.offerMessage) {
			await prisma.chatRoom.update({
				where: { id: result.chatRoomId },
				data: {
					context: {
						...((row?.context ?? {}) as Record<string, unknown>),
						offerMessage: args.offerMessage,
					} as Prisma.InputJsonValue,
				},
			});
		}

		// Re-apply after a withdraw/reject finds the pair's old Closed room —
		// reopen it so the conversation continues in one place. Never for a
		// closed/expired vacancy, and only when the caller explicitly allows it.
		if (
			!isOpen &&
			args.allowReopen &&
			vacancy.status === TeamVacancyStatus.Published
		) {
			await prisma.chatRoom.update({
				where: { id: result.chatRoomId },
				data: { status: ChatRoomStatus.Open, finishedAt: null },
			});
			isOpen = true;
			try {
				await makeRoomWritable(result.roomId);
			} catch (error) {
				console.error("[chat] makeRoomWritable failed", error);
			}
		}

		// If the invitee previously left the room, the existing ChatRoom is dead
		// for them — re-invite so the chat reappears. Only into an OPEN room, and
		// idempotent: already-joined / already-invited returns false (Matrix 403).
		if (isOpen) {
			try {
				reinvited = await inviteUserToRoom(
					initiatorUserId,
					result.roomId,
					inviteeUserId,
				);
			} catch (error) {
				console.error("[chat] vacancy re-invite failed", error);
			}
		}
	}

	return { ...result, inviteeUserId, reinvited };
}
