import { AuditAction } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import {
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import {
	type AcceptanceFilters,
	acceptancesCsv,
	exportAcceptances,
	listAcceptances,
} from "@/repositories/legal/acceptances";
import { prisma } from "@/services/prisma";

const QuerySchema = z.object({
	page: z.coerce.number().int().positive().optional(),
	limit: z.coerce.number().int().positive().max(100).optional(),
	search: z.string().optional(),
	code: z.string().optional(),
	version: z.coerce.number().int().positive().optional(),
	context: z.string().optional(),
	from: z.coerce.date().optional(),
	to: z.coerce.date().optional(),
	format: z.enum(["json", "csv"]).optional(),
});

type Query = z.infer<typeof QuerySchema>;

export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.legal.view" }),
	withValidation(QuerySchema, "query"),
)(async (_req, _ctx, { user, body }) => {
	const { page = 1, limit = 20, format, ...filters } = body as Query;

	if (format !== "csv") {
		return json(
			await listAcceptances(filters as AcceptanceFilters, page, limit),
		);
	}

	const rows = await exportAcceptances(filters as AcceptanceFilters);
	// Names, IPs and user agents leave the platform in this file: who took it is on record.
	await prisma.auditLog.create({
		data: {
			actorUserId: (user as SessionUser).id,
			entity: "legal_acceptances_export",
			entityId: "csv",
			action: AuditAction.CREATE,
			meta: { filters: JSON.parse(JSON.stringify(filters)), rows: rows.length },
		},
	});
	return new Response(acceptancesCsv(rows), {
		headers: {
			"Content-Type": "text/csv; charset=utf-8",
			"Content-Disposition": `attachment; filename="legal-acceptances-${new Date().toISOString().slice(0, 10)}.csv"`,
		},
	});
});
