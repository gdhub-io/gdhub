import {
	AdviceRequestStatus,
	type ChatRoomKind,
	type ChatRoomStatus,
} from "@gdhub-io/gdhub-prisma";
import { TeamMemberStatus } from "@/config/prisma-enums";
import { currentSprint, sprintRange } from "@/lib/checkpoints/sprints";
import { checkpointNumber } from "@/repositories/checkpoints/number";
import { prisma } from "@/services/prisma";

export type ChatRoomRow = {
	id: string;
	kind: ChatRoomKind;
	status: ChatRoomStatus;
	finishedAt: Date | null;
	createdAt?: Date;
	// Untyped `Json?` column: Prisma 7 surfaces it as `unknown`, so every reader
	// narrows it to its own context shape.
	context: unknown;
};

export type ChatContextResult = {
	type: string;
	data: Record<string, unknown> | null;
	[key: string]: unknown;
};

// Method syntax on purpose: it keeps the loaded param bivariant, so providers
// with a concrete TLoaded fit the heterogeneous registry below.
export interface ChatKindProvider<TLoaded = unknown> {
	/**
	 * Load the domain entity ONCE per request — the hooks below receive it,
	 * so a single route never repeats the same query.
	 */
	load(room: ChatRoomRow): Promise<TLoaded | null>;
	/** Build the display context the chat window renders. */
	buildContext(
		room: ChatRoomRow,
		loaded: TLoaded | null,
		currentUserId: string,
	): ChatContextResult;
	/** Whether the given user may archive/close the chat. */
	canClose(
		room: ChatRoomRow,
		loaded: TLoaded | null,
		currentUserId: string,
	): boolean;
	/** Sync the domain entity when the chat is closed (best-effort). */
	onClose?(room: ChatRoomRow): Promise<void>;
	/**
	 * Platform user ids of the chat participants — used to notify the
	 * counterpart on close without querying Matrix.
	 */
	participantIds?(room: ChatRoomRow, loaded: TLoaded | null): string[];
}

const DEFAULT_CONTEXT: ChatContextResult = { type: "default", data: null };

type VacancyOfferContext = {
	vacancyId?: string;
	candidateUserId?: string;
	applicationId?: string | null;
	offerMessage?: string | null;
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

type VacancyOfferLoaded = NonNullable<
	Awaited<ReturnType<typeof loadVacancyOffer>>
>;

const vacancyOfferProvider: ChatKindProvider<VacancyOfferLoaded> = {
	load: loadVacancyOffer,
	buildContext(room, loaded, currentUserId) {
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
				appliedAt: room.createdAt ?? null,
				offerMessage: ctx.offerMessage ?? null,
			},
			isRecruiter: ctx.candidateUserId !== currentUserId,
		};
	},
	canClose(_room, loaded, currentUserId) {
		const authorId = loaded?.vacancy?.team?.project?.authorId;
		return (
			currentUserId === loaded?.ctx.candidateUserId ||
			currentUserId === authorId
		);
	},
	participantIds(_room, loaded) {
		const authorId = loaded?.vacancy?.team?.project?.authorId;
		return [loaded?.ctx.candidateUserId, authorId].filter(
			(id): id is string => !!id,
		);
	},
};

// Generic 1:1 DM (creation is admin-gated at the route level for now).
const directProvider: ChatKindProvider<null> = {
	load: async () => null,
	buildContext: () => DEFAULT_CONTEXT,
	canClose: () => false,
};

type AdviceRequestContext = {
	adviceRequestId?: string;
	fromUserId?: string;
	toUserId?: string;
};

async function loadAdviceRequest(room: ChatRoomRow) {
	const ctx = (room.context ?? {}) as AdviceRequestContext;
	if (!ctx.adviceRequestId) return null;

	return prisma.adviceRequest.findUnique({
		where: { id: ctx.adviceRequestId },
		select: {
			id: true,
			topic: true,
			comment: true,
			status: true,
			finishedAt: true,
			fromUserId: true,
			toUserId: true,
			project: { select: { id: true, name: true, coverImage: true } },
		},
	});
}

type AdviceRequestLoaded = NonNullable<
	Awaited<ReturnType<typeof loadAdviceRequest>>
>;

const adviceRequestProvider: ChatKindProvider<AdviceRequestLoaded> = {
	load: loadAdviceRequest,
	buildContext(_room, adviceRequest, currentUserId) {
		if (!adviceRequest) return DEFAULT_CONTEXT;

		return {
			type: "advice-request",
			data: {
				id: adviceRequest.id,
				topic: adviceRequest.topic,
				comment: adviceRequest.comment,
				status: adviceRequest.status,
				finishedAt: adviceRequest.finishedAt,
				project: adviceRequest.project,
			},
			isExpert: adviceRequest.toUserId === currentUserId,
		};
	},
	// Either participant may resolve the question, any time.
	canClose(_room, adviceRequest, currentUserId) {
		return (
			adviceRequest?.fromUserId === currentUserId ||
			adviceRequest?.toUserId === currentUserId
		);
	},
	async onClose(room) {
		const ctx = (room.context ?? {}) as AdviceRequestContext;
		if (!ctx.adviceRequestId) return;
		await prisma.adviceRequest.updateMany({
			where: {
				id: ctx.adviceRequestId,
				status: { not: AdviceRequestStatus.Closed },
			},
			data: {
				status: AdviceRequestStatus.Closed,
				finishedAt: new Date(),
			},
		});
	},
	participantIds(_room, adviceRequest) {
		if (!adviceRequest) return [];
		return [adviceRequest.fromUserId, adviceRequest.toUserId].filter(
			(id): id is string => !!id,
		);
	},
};

type CheckpointRoomContext = { checkpointId?: string; userIds?: string[] };

async function loadCheckpoint(room: ChatRoomRow) {
	const ctx = (room.context ?? {}) as CheckpointRoomContext;
	if (!ctx.checkpointId) return null;

	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id: ctx.checkpointId },
		select: {
			projectId: true,
			createdAt: true,
			startedAt: true,
			dueAt: true,
			status: true,
			curator: {
				select: {
					name: true,
					// The talent card shows the speciality they curate with.
					specialities: {
						where: { isOpenForMentoring: true },
						select: { id: true },
						take: 1,
					},
				},
			},
			project: {
				select: {
					name: true,
					slug: true,
					author: { select: { id: true, name: true } },
					team: {
						select: {
							members: {
								where: { status: TeamMemberStatus.Founder },
								select: { userId: true, specialityId: true },
							},
						},
					},
				},
			},
		},
	});
	if (!checkpoint) return null;

	return { ctx, checkpoint, number: await checkpointNumber(checkpoint) };
}

type CheckpointLoaded = NonNullable<Awaited<ReturnType<typeof loadCheckpoint>>>;

// The curator and the team, for the length of the checkpoint. Nobody closes it
// from the chat: it ends with the checkpoint.
const checkpointProvider: ChatKindProvider<CheckpointLoaded> = {
	load: loadCheckpoint,
	buildContext(_room, loaded) {
		if (!loaded) return DEFAULT_CONTEXT;
		const { checkpoint, number } = loaded;
		const author = checkpoint.project.author;
		const { startedAt } = checkpoint;
		const sprint = startedAt ? currentSprint(startedAt) : null;
		const range = startedAt && sprint ? sprintRange(startedAt, sprint) : null;

		return {
			type: "checkpoint",
			data: {
				number,
				status: checkpoint.status,
				startedAt,
				dueAt: checkpoint.dueAt,
				sprint: sprint && range ? { number: sprint, ...range } : null,
				curator: checkpoint.curator
					? {
							name: checkpoint.curator.name,
							specialityId: checkpoint.curator.specialities[0]?.id ?? null,
						}
					: null,
				author: author
					? {
							name: author.name,
							specialityId:
								checkpoint.project.team?.members.find(
									(member) => member.userId === author.id,
								)?.specialityId ?? null,
						}
					: null,
				project: {
					name: checkpoint.project.name,
					slug: checkpoint.project.slug,
				},
			},
		};
	},
	canClose: () => false,
	participantIds: (_room, loaded) => loaded?.ctx.userIds ?? [],
};

// Everyone reads it and nobody closes it; who may post is the post route's call.
const announcementsProvider: ChatKindProvider<null> = {
	load: async () => null,
	buildContext: () => ({ type: "announcements", data: null }),
	canClose: () => false,
};

export const chatProviders: Partial<Record<ChatRoomKind, ChatKindProvider>> = {
	Announcements: announcementsProvider,
	VacancyOffer: vacancyOfferProvider,
	Direct: directProvider,
	AdviceRequest: adviceRequestProvider,
	Checkpoint: checkpointProvider,
};

export function getChatProvider(
	kind: ChatRoomKind,
): ChatKindProvider | undefined {
	return chatProviders[kind];
}
