import { AdviceRequestStatus } from "@gdhub-io/gdhub-prisma";
import { pageMeta } from "@/lib/pagination";
import { prisma } from "@/services/prisma";

/**
 * The inbox's four filters, as the statuses behind them.
 *
 * `Rejected` and `Closed` get none of their own — declined and withdrawn are
 * history, not work, and surface under `all`.
 */
export const REQUEST_FILTERS = {
	new: [AdviceRequestStatus.Created],
	inProgress: [AdviceRequestStatus.Approved],
	answered: [AdviceRequestStatus.Executed],
	all: null,
} as const;

export type RequestFilter = keyof typeof REQUEST_FILTERS;

export const isRequestFilter = (value: string): value is RequestFilter =>
	value in REQUEST_FILTERS;

export type AdvisorRequest = {
	id: string;
	status: AdviceRequestStatus;
	askedAt: string;
	/** The question's one-line subject — the card's title. */
	topic: string | null;
	/** The question itself. */
	question: string | null;
	/** Set once accepted; what "Open chat" resolves the room by. */
	matrixRoomId: string | null;
	asker: {
		name: string;
		image: string | null;
		/** Their role on the project the question came from, when they hold one. */
		role: string | null;
		/** The craft behind that role — what colours the card's tile. */
		direction: string | null;
		/** The speciality that role sits on — what the talent card is keyed by. */
		specialityId: string | null;
	};
	project: {
		id: string;
		slug: string;
		name: string;
		/** Where the project stands, from its workflow. */
		stage: string | null;
	} | null;
};

export type RequestCounts = Record<RequestFilter, number>;

/** Blind to the search box: the numbers say what is waiting, not what matches. */
export async function countAdvisorRequests(
	advisorId: string,
): Promise<RequestCounts> {
	const rows = await prisma.adviceRequest.groupBy({
		by: ["status"],
		where: { toUserId: advisorId },
		_count: { _all: true },
	});

	const held = new Map(rows.map((row) => [row.status, row._count._all]));
	const sum = (statuses: readonly AdviceRequestStatus[]) =>
		statuses.reduce((total, status) => total + (held.get(status) ?? 0), 0);

	return {
		new: sum(REQUEST_FILTERS.new),
		inProgress: sum(REQUEST_FILTERS.inProgress),
		answered: sum(REQUEST_FILTERS.answered),
		all: rows.reduce((total, row) => total + row._count._all, 0),
	};
}

const REQUEST_SELECT = {
	id: true,
	status: true,
	createdAt: true,
	topic: true,
	comment: true,
	matrixRoomId: true,
	fromUserId: true,
	fromUser: {
		select: { image: true, profile: { select: { name: true } } },
	},
	fromTelegramUser: true,
	project: {
		select: {
			id: true,
			slug: true,
			name: true,
			team: { select: { id: true } },
			workflow: { select: { currentStep: { select: { name: true } } } },
		},
	},
} as const;

/** A Telegram asker has no account, only whatever the bot captured. */
const telegramName = (payload: unknown): string | null => {
	if (!payload || typeof payload !== "object") return null;

	const user = payload as Record<string, unknown>;
	const parts = [user.first_name, user.last_name].filter(
		(part): part is string => typeof part === "string" && part.length > 0,
	);

	if (parts.length > 0) return parts.join(" ");

	return typeof user.username === "string" ? `@${user.username}` : null;
};

/**
 * The asker's role on the project they asked about.
 *
 * A second query because the row to keep depends on the request's own
 * `fromUserId`, and Prisma cannot filter a nested relation by a sibling column.
 */
type TeamRole = {
	role: string | null;
	direction: string | null;
	specialityId: string | null;
};

async function rolesOnProjects(
	pairs: { teamId: string; userId: string }[],
): Promise<Map<string, TeamRole>> {
	if (pairs.length === 0) return new Map();

	const members = await prisma.teamMember.findMany({
		where: {
			teamId: { in: [...new Set(pairs.map((pair) => pair.teamId))] },
			userId: { in: [...new Set(pairs.map((pair) => pair.userId))] },
		},
		select: {
			teamId: true,
			userId: true,
			position: true,
			speciality: {
				select: { id: true, name: true, direction: { select: { name: true } } },
			},
		},
	});

	return new Map(
		members.map((member) => [
			`${member.teamId}:${member.userId}`,
			{
				role: member.position || member.speciality?.name || null,
				direction: member.speciality?.direction?.name ?? null,
				specialityId: member.speciality?.id ?? null,
			},
		]),
	);
}

/**
 * One page of the advisor's inbox, newest first.
 *
 * `toUserId` is the whole boundary: the space is single-instance and shared, so
 * the caller's id is the only thing separating one inbox from the next.
 */
export async function listAdvisorRequests(
	advisorId: string,
	{
		filter = "all",
		search,
		page = 1,
		limit = 10,
	}: { filter?: RequestFilter; search?: string; page?: number; limit?: number },
) {
	const statuses = REQUEST_FILTERS[filter];
	const term = search?.trim();

	const where = {
		toUserId: advisorId,
		...(statuses ? { status: { in: [...statuses] } } : {}),
		...(term
			? {
					OR: [
						{
							fromUser: {
								profile: {
									name: { contains: term, mode: "insensitive" as const },
								},
							},
						},
						{
							project: {
								name: { contains: term, mode: "insensitive" as const },
							},
						},
					],
				}
			: {}),
	};

	const [totalCount, rows] = await Promise.all([
		prisma.adviceRequest.count({ where }),
		prisma.adviceRequest.findMany({
			where,
			select: REQUEST_SELECT,
			orderBy: { createdAt: "desc" },
			skip: (page - 1) * limit,
			take: limit,
		}),
	]);

	const roles = await rolesOnProjects(
		rows.flatMap((row) =>
			row.project?.team && row.fromUserId
				? [{ teamId: row.project.team.id, userId: row.fromUserId }]
				: [],
		),
	);

	const data: AdvisorRequest[] = rows.map((row) => {
		const onTeam =
			row.project?.team && row.fromUserId
				? roles.get(`${row.project.team.id}:${row.fromUserId}`)
				: undefined;

		return {
			id: row.id,
			status: row.status,
			askedAt: row.createdAt.toISOString(),
			topic: row.topic,
			question: row.comment,
			matrixRoomId: row.matrixRoomId,
			asker: {
				name:
					row.fromUser?.profile?.name ||
					telegramName(row.fromTelegramUser) ||
					"Someone",
				image: row.fromUser?.image ?? null,
				role: onTeam?.role ?? null,
				direction: onTeam?.direction ?? null,
				specialityId: onTeam?.specialityId ?? null,
			},
			project: row.project
				? {
						id: row.project.id,
						slug: row.project.slug,
						name: row.project.name,
						stage: row.project.workflow?.currentStep?.name ?? null,
					}
				: null,
		};
	});

	return { data, meta: pageMeta(totalCount, page, limit) };
}

/**
 * The speciality a question was asked in — knowable only when one is open.
 *
 * `AdviceRequest` records no `specialityId`, so with two open specialities this
 * would be a guess, and the cards would rather say nothing.
 */
export async function askedInSpeciality(
	advisorId: string,
): Promise<string | null> {
	const open = await prisma.speciality.findMany({
		where: { userId: advisorId, isOpenForMentoring: true },
		select: { name: true },
		take: 2,
	});

	return open.length === 1 ? open[0].name : null;
}
