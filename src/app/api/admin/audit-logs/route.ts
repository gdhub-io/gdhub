import { AuditAction, type Prisma } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import { json, pipe, withAuth, withValidation } from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { prisma } from "@/services/prisma";
import { AUDIT_SOURCES, type AuditSource } from "@/types/audit";

const AuditLogsQuerySchema = z.object({
	page: z.string().optional(),
	limit: z.string().optional(),
	search: z.string().optional(),
	/** Comma-separated `AuditAction` values. */
	action: z.string().optional(),
	entity: z.string().optional(),
	source: z.string().optional(),
	status: z.enum(["OK", "FAILED"]).optional(),
	from: z.string().optional(),
	to: z.string().optional(),
});

type AuditLogsQuery = z.infer<typeof AuditLogsQuerySchema>;

const toPositiveInt = (value: unknown, fallback: number) => {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
	return Math.floor(parsed);
};

const clamp = (value: number, min: number, max: number) =>
	Math.min(Math.max(value, min), max);

const list = (value: string | undefined): string[] =>
	value
		? value
				.split(",")
				.map((item) => item.trim())
				.filter(Boolean)
		: [];

const parseDate = (value: string | undefined): Date | undefined => {
	if (!value) return undefined;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? undefined : date;
};

type AuditActionValue = (typeof AuditAction)[keyof typeof AuditAction];

/** Drops unknown names rather than letting Prisma reject the whole query. */
const parseActions = (value: string | undefined): AuditActionValue[] =>
	list(value).filter((item): item is AuditActionValue => item in AuditAction);

const parseSources = (value: string | undefined): AuditSource[] =>
	list(value).filter((item): item is AuditSource =>
		AUDIT_SOURCES.includes(item as AuditSource),
	);

export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.audit_logs.view" }),
	withValidation(AuditLogsQuerySchema, "query"),
)(async (_req, _ctx, { body }) => {
	const query = body as AuditLogsQuery;
	const limit = clamp(toPositiveInt(query.limit, 20), 1, 100);

	const actions = parseActions(query.action);
	const entities = list(query.entity);
	const sources = parseSources(query.source);
	const from = parseDate(query.from);
	const to = parseDate(query.to);
	const search = query.search?.trim();

	// An actor is a plain id column with no relation, so searching by person means
	// resolving the people first.
	const matchedActorIds = search
		? (
				await prisma.user.findMany({
					where: {
						OR: [
							{ name: { contains: search, mode: "insensitive" } },
							{ email: { contains: search, mode: "insensitive" } },
						],
					},
					select: { id: true },
					take: 100,
				})
			).map((user) => user.id)
		: [];

	const searchFilter: Prisma.AuditLogWhereInput | undefined = search
		? {
				OR: [
					{ entityLabel: { contains: search, mode: "insensitive" } },
					{ entityId: search },
					{ requestId: search },
					...(matchedActorIds.length
						? [
								{ actorUserId: { in: matchedActorIds } },
								{ subjectUserId: { in: matchedActorIds } },
							]
						: []),
				],
			}
		: undefined;

	const dateFilter =
		from || to
			? {
					createdAt: {
						...(from ? { gte: from } : {}),
						...(to ? { lte: to } : {}),
					},
				}
			: undefined;

	const baseFilters: Prisma.AuditLogWhereInput = {
		...(sources.length ? { source: { in: sources } } : {}),
		...(query.status ? { status: query.status } : {}),
		...(dateFilter ?? {}),
		...(searchFilter ?? {}),
	};

	const actionFilter: Prisma.AuditLogWhereInput = actions.length
		? { action: { in: actions } }
		: {};
	const entityFilter: Prisma.AuditLogWhereInput = entities.length
		? { entity: { in: entities } }
		: {};

	const where: Prisma.AuditLogWhereInput = {
		...baseFilters,
		...actionFilter,
		...entityFilter,
	};

	// Fetched alongside the count since only an out-of-range `page` needs re-fetching.
	// Facets exclude their own dimension, so unticking a filter still shows what
	// re-picking it would bring back.
	const requestedPage = toPositiveInt(query.page, 1);
	const [totalCount, firstTry, actionFacets, entityFacets] = await Promise.all([
		prisma.auditLog.count({ where }),
		prisma.auditLog.findMany({
			where,
			orderBy: { createdAt: "desc" },
			skip: (requestedPage - 1) * limit,
			take: limit,
		}),
		prisma.auditLog.groupBy({
			by: ["action"],
			where: { ...baseFilters, ...entityFilter },
			_count: { _all: true },
		}),
		prisma.auditLog.groupBy({
			by: ["entity"],
			where: { ...baseFilters, ...actionFilter },
			_count: { _all: true },
			orderBy: { _count: { entity: "desc" } },
		}),
	]);

	const pageCount = Math.max(Math.ceil(totalCount / limit), 1);
	const currentPage = clamp(requestedPage, 1, pageCount);

	const rows =
		currentPage === requestedPage
			? firstTry
			: await prisma.auditLog.findMany({
					where,
					orderBy: { createdAt: "desc" },
					skip: (currentPage - 1) * limit,
					take: limit,
				});

	const userIds = [
		...new Set(
			rows.flatMap((row) =>
				[row.actorUserId, row.subjectUserId].filter(
					(id): id is string => typeof id === "string",
				),
			),
		),
	];

	const users = userIds.length
		? await prisma.user.findMany({
				where: { id: { in: userIds } },
				select: { id: true, name: true, image: true, email: true },
			})
		: [];

	const byId = new Map(users.map((user) => [user.id, user]));

	return json({
		data: rows.map((row) => ({
			id: row.id,
			createdAt: row.createdAt,
			action: row.action,
			status: row.status,
			entity: row.entity,
			entityId: row.entityId,
			entityLabel: row.entityLabel,
			source: row.source,
			requestId: row.requestId,
			changes: row.changes,
			meta: row.meta,
			actor: row.actorUserId ? (byId.get(row.actorUserId) ?? null) : null,
			subject: row.subjectUserId ? (byId.get(row.subjectUserId) ?? null) : null,
		})),
		meta: { currentPage, pageCount, totalCount },
		facets: {
			actions: actionFacets.map((facet) => ({
				value: facet.action,
				count: facet._count._all,
			})),
			entities: entityFacets.map((facet) => ({
				value: facet.entity,
				count: facet._count._all,
			})),
		},
	});
});
