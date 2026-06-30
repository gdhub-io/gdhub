import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { prisma } from "@/services/prisma";

export type ChatRoomRow = {
	id: string;
	kind: prismaClient.ChatRoomKind;
	status: prismaClient.ChatRoomStatus;
	finishedAt: Date | null;
	context: prismaClient.Prisma.JsonValue | null;
};

export type ChatContextResult = {
	type: string;
	data: Record<string, unknown> | null;
	[key: string]: unknown;
};

export type ChatKindProvider = {
	/** Build the display context the chat window renders. */
	buildContext: (
		room: ChatRoomRow,
		currentUserId: string,
	) => Promise<ChatContextResult>;
	/** Whether the given user may archive/close the chat. */
	canClose: (room: ChatRoomRow, currentUserId: string) => Promise<boolean>;
};

const DEFAULT_CONTEXT: ChatContextResult = { type: "default", data: null };

type VacancyOfferContext = {
	vacancyId?: string;
	candidateUserId?: string;
	teamMemberId?: string | null;
};

async function loadVacancyOffer(room: ChatRoomRow) {
	const ctx = (room.context ?? {}) as VacancyOfferContext;
	if (!ctx.vacancyId || !ctx.candidateUserId) return null;

	const vacancy = await prisma.teamVacancy.findUnique({
		where: { id: ctx.vacancyId },
		select: {
			id: true,
			title: true,
			offeredAmount: true,
			offeredRateType: true,
			promisePercentage: true,
			team: {
				select: {
					project: {
						select: { id: true, name: true, slug: true, authorId: true },
					},
				},
			},
		},
	});

	return { ctx, vacancy };
}

const vacancyOfferProvider: ChatKindProvider = {
	buildContext: async (room, currentUserId) => {
		const loaded = await loadVacancyOffer(room);
		if (!loaded?.vacancy) return DEFAULT_CONTEXT;
		const { ctx, vacancy } = loaded;
		const project = vacancy.team?.project;

		return {
			type: "vacancy-application",
			data: {
				id: room.id,
				status: room.status,
				finishedAt: room.finishedAt,
				vacancy: {
					id: vacancy.id,
					title: vacancy.title,
					offeredAmount: vacancy.offeredAmount,
					offeredRateType: vacancy.offeredRateType,
					promisePercentage: vacancy.promisePercentage,
				},
				project: project
					? { id: project.id, name: project.name, slug: project.slug }
					: null,
			},
			isRecruiter: ctx.candidateUserId !== currentUserId,
		};
	},
	canClose: async (room, currentUserId) => {
		const loaded = await loadVacancyOffer(room);
		const authorId = loaded?.vacancy?.team?.project?.authorId;
		return (
			currentUserId === loaded?.ctx.candidateUserId ||
			currentUserId === authorId
		);
	},
};

const adminDirectProvider: ChatKindProvider = {
	buildContext: async () => DEFAULT_CONTEXT,
	canClose: async () => false,
};

export const chatProviders: Partial<
	Record<prismaClient.ChatRoomKind, ChatKindProvider>
> = {
	VacancyOffer: vacancyOfferProvider,
	AdminDirect: adminDirectProvider,
};

export function getChatProvider(
	kind: prismaClient.ChatRoomKind,
): ChatKindProvider | undefined {
	return chatProviders[kind];
}
