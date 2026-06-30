import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { prisma } from "@/services/prisma";
import { type EnsureChatRoomResult, ensureChatRoom } from "./ensure-room";

/** Deterministic registry key for a vacancy ↔ candidate chat. */
export function vacancyChatDirectKey(
	vacancyId: string,
	candidateUserId: string,
): string {
	return `vacancy:${vacancyId}:${candidateUserId}`;
}

type EnsureVacancyOfferChatArgs = {
	vacancyId: string;
	candidateUserId: string;
	/** Who starts the chat — must be the candidate or the project author. */
	initiatorUserId: string;
	teamMemberId?: string;
	firstMessage?: string;
};

export type EnsureVacancyOfferChatResult = EnsureChatRoomResult & {
	inviteeUserId: string;
};

/**
 * Provision the 1:1 vacancy chat (candidate ↔ project author) on the ChatRoom
 * registry. The initiator invites the other party. Idempotent per
 * (vacancy, candidate) via the directKey.
 */
export async function ensureVacancyOfferChat(
	args: EnsureVacancyOfferChatArgs,
): Promise<EnsureVacancyOfferChatResult> {
	const { vacancyId, candidateUserId, initiatorUserId, teamMemberId } = args;

	const vacancy = await prisma.teamVacancy.findUnique({
		where: { id: vacancyId },
		select: {
			id: true,
			title: true,
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
		kind: prismaClient.ChatRoomKind.VacancyOffer,
		directKey: vacancyChatDirectKey(vacancyId, candidateUserId),
		title: vacancy.title,
		topic: vacancy.team?.project?.name || undefined,
		isDirect: true,
		context: { vacancyId, candidateUserId, teamMemberId: teamMemberId ?? null },
		initiatorUserId,
		inviteeUserIds: [inviteeUserId],
		avatarUrl: vacancy.team?.project?.coverImage || undefined,
		firstMessage: args.firstMessage,
	});

	return { ...result, inviteeUserId };
}
