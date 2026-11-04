import {
	ChatRoomStatus,
	PayableType,
	type PaymentStatus,
	type Prisma,
	TeamVacancyStatus,
	VacancyApplicationStatus,
} from "@gdhub-io/gdhub-prisma";
import {
	type ListingState,
	listingStateOf,
	type PositionState,
	positionStateOf,
} from "@/lib/vacancy/listing-state";
import { vacancyChatDirectKey } from "@/services/chat/vacancy-keys";
import { prisma } from "@/services/prisma";

/** The latest listing payment of each position, by vacancy id. */
const latestPayments = async (vacancyIds?: string[]) => {
	const payments = await prisma.payment.findMany({
		where: {
			payableType: PayableType.VACANCY,
			...(vacancyIds ? { payableId: { in: vacancyIds } } : {}),
		},
		orderBy: { createdAt: "desc" },
		distinct: ["payableId"],
		select: { payableId: true, status: true, amount: true, currency: true },
	});
	return new Map(payments.map((payment) => [payment.payableId, payment]));
};

/** The fee as charged, shown only once it was actually paid. */
const feeOf = (
	payment:
		| { status: PaymentStatus; amount: number; currency: string }
		| undefined,
) =>
	payment && listingStateOf(payment.status) === "paid"
		? { amount: payment.amount, currency: payment.currency }
		: null;

const positionWhere = (
	state: PositionState | undefined,
	now: Date,
): Prisma.TeamVacancyWhereInput => {
	switch (state) {
		case "draft":
			return { status: TeamVacancyStatus.Draft };
		case "closed":
			return { status: TeamVacancyStatus.Closed };
		case "published":
			return { status: TeamVacancyStatus.Published, finishedAt: { gte: now } };
		case "expired":
			return { status: TeamVacancyStatus.Published, finishedAt: { lt: now } };
		default:
			return {};
	}
};

/** Which positions are in a listing state: the payment table answers, "free" is its complement. */
const listingWhere = async (
	listing: ListingState | undefined,
): Promise<Prisma.TeamVacancyWhereInput> => {
	if (!listing) return {};
	const latest = await latestPayments();
	if (listing === "free") return { id: { notIn: [...latest.keys()] } };
	const ids = [...latest].flatMap(([id, payment]) =>
		listingStateOf(payment.status) === listing ? [id] : [],
	);
	return { id: { in: ids } };
};

export type AdminPositionsQuery = {
	search?: string;
	state?: PositionState;
	listing?: ListingState;
	page: number;
	pageSize: number;
};

/** Every open position on the platform, newest first (frame 10.19). Read-only. */
export async function listAdminPositions(query: AdminPositionsQuery) {
	const now = new Date();
	const search = query.search?.trim();
	const where: Prisma.TeamVacancyWhereInput = {
		AND: [
			positionWhere(query.state, now),
			await listingWhere(query.listing),
			search
				? {
						OR: [
							{ title: { contains: search, mode: "insensitive" } },
							{
								team: {
									project: { name: { contains: search, mode: "insensitive" } },
								},
							},
						],
					}
				: {},
		],
	};

	const [total, rows] = await Promise.all([
		prisma.teamVacancy.count({ where }),
		prisma.teamVacancy.findMany({
			where,
			orderBy: { createdAt: "desc" },
			skip: (query.page - 1) * query.pageSize,
			take: query.pageSize,
			select: {
				id: true,
				title: true,
				status: true,
				publishedAt: true,
				finishedAt: true,
				viewsCount: true,
				offeredAmount: true,
				offeredRateType: true,
				direction: { select: { name: true } },
				team: { select: { project: { select: { name: true, slug: true } } } },
				_count: { select: { applications: true } },
				applications: {
					where: { status: VacancyApplicationStatus.Submitted },
					select: { id: true },
				},
			},
		}),
	]);

	const payments = await latestPayments(rows.map((row) => row.id));

	return {
		total,
		rows: rows.map(({ applications, _count, team, ...row }) => ({
			...row,
			project: team.project,
			state: positionStateOf(row, now),
			listing: listingStateOf(payments.get(row.id)?.status),
			listingFee: feeOf(payments.get(row.id)),
			applications: _count.applications,
			openApplications: applications.length,
		})),
	};
}

/**
 * A position's applications, as the admin reads them (frame 10.20). The chat is
 * our `ChatRoom` row only — whether it opened, when the author last read it,
 * whether it closed; what was said lives in Matrix and is not read here.
 */
export async function getAdminPositionApplications(vacancyId: string) {
	const vacancy = await prisma.teamVacancy.findUnique({
		where: { id: vacancyId },
		select: {
			id: true,
			title: true,
			status: true,
			finishedAt: true,
			team: {
				select: {
					project: { select: { name: true, slug: true, authorId: true } },
				},
			},
			applications: {
				orderBy: { createdAt: "desc" },
				select: {
					id: true,
					userId: true,
					status: true,
					message: true,
					allowedContacts: true,
					viewedAt: true,
					decidedAt: true,
					createdAt: true,
					user: {
						select: {
							name: true,
							image: true,
							profile: { select: { name: true } },
						},
					},
					speciality: { select: { id: true, name: true, level: true } },
				},
			},
		},
	});
	if (!vacancy) return null;

	const authorId = vacancy.team.project?.authorId;
	const rooms = await prisma.chatRoom.findMany({
		where: {
			directKey: {
				in: vacancy.applications.map((application) =>
					vacancyChatDirectKey(vacancy.id, application.userId),
				),
			},
		},
		select: {
			directKey: true,
			status: true,
			createdAt: true,
			finishedAt: true,
			members: {
				where: { userId: authorId ?? "" },
				select: { lastReadAt: true },
			},
		},
	});
	const roomOf = new Map(rooms.map((room) => [room.directKey, room]));
	const [payment] = (await latestPayments([vacancy.id])).values();

	return {
		id: vacancy.id,
		title: vacancy.title,
		state: positionStateOf(vacancy),
		listing: listingStateOf(payment?.status),
		listingFee: feeOf(payment),
		finishedAt: vacancy.finishedAt,
		project: vacancy.team.project
			? { name: vacancy.team.project.name, slug: vacancy.team.project.slug }
			: null,
		applications: vacancy.applications.map(
			({ userId, user, ...application }) => {
				const room = roomOf.get(vacancyChatDirectKey(vacancy.id, userId));
				return {
					...application,
					candidate: {
						name: user.profile?.name || user.name,
						image: user.image,
					},
					chat: room
						? {
								openedAt: room.createdAt,
								closedAt: room.finishedAt,
								open: room.status === ChatRoomStatus.Open,
								authorLastReadAt: room.members[0]?.lastReadAt ?? null,
							}
						: null,
				};
			},
		),
	};
}
