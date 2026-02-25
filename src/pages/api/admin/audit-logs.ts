import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { createHandler, Get, Query } from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";
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

type PaginatedAuditLogsResponse = {
	data: AuditLogRow[];
	meta: {
		currentPage: number;
		pageCount: number;
		totalCount: number;
	};
};

const toPositiveInt = (value: unknown, fallback: number) => {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
	return Math.floor(parsed);
};

const clamp = (value: number, min: number, max: number) =>
	Math.min(Math.max(value, min), max);

@NextAuthGuard("user", [prismaClient.UserRole.Admin])
class ApiAuditLogsAdminHandler {
	@Get()
	public async list(
		@Query("page") pageQuery?: string,
		@Query("limit") limitQuery?: string,
	): Promise<PaginatedAuditLogsResponse> {
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

		return {
			data,
			meta: {
				currentPage,
				pageCount,
				totalCount,
			},
		};
	}
}

export default createHandler(ApiAuditLogsAdminHandler);
