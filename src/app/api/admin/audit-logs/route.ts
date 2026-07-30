import { UserRole } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import { json, withAuth, withValidation } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

type AuditLogRow = {
	id: string;
	actorUserId: string | null;
	subjectUserId: string | null;
	entity: string;
	entityId: string | null;
	action: string;
	changes: unknown;
	meta: unknown;
	createdAt: Date;
};

const AuditLogsQuerySchema = z.object({
	page: z.string().optional(),
	limit: z.string().optional(),
});

type AuditLogsQuery = z.infer<typeof AuditLogsQuerySchema>;

const toPositiveInt = (value: unknown, fallback: number) => {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
	return Math.floor(parsed);
};

const clamp = (value: number, min: number, max: number) =>
	Math.min(Math.max(value, min), max);

export const GET = withAuth({
	mode: "user",
	roles: [UserRole.Admin],
})(
	withValidation(
		AuditLogsQuerySchema,
		"query",
	)(async (_req, _ctx, { body }) => {
		const { page: pageQuery, limit: limitQuery } = body as AuditLogsQuery;
		const requestedPage = toPositiveInt(pageQuery, 1);
		const limit = clamp(toPositiveInt(limitQuery, 20), 1, 100);

		const countRows = await prisma.$queryRaw<{ count: bigint }[]>`
			SELECT COUNT(*)::bigint as count
			FROM "AuditLog"
		`;
		const totalCount = Number(countRows[0]?.count || 0n);
		const pageCount = Math.max(Math.ceil(totalCount / limit), 1);
		const currentPage = clamp(requestedPage, 1, pageCount);
		const skip = (currentPage - 1) * limit;

		const data = await prisma.$queryRaw<AuditLogRow[]>`
			SELECT
				id,
				"actorUserId",
				"subjectUserId",
				entity,
				"entityId",
				action::text as action,
				changes,
				meta,
				"createdAt"
			FROM "AuditLog"
			ORDER BY "createdAt" DESC
			LIMIT ${limit}
			OFFSET ${skip}
		`;

		return json({
			data,
			meta: {
				currentPage,
				pageCount,
				totalCount,
			},
		});
	}),
);
