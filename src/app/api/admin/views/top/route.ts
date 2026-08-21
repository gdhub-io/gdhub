import { json, pipe, withAuth, withValidation } from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import {
	getTopSubjects,
	resolveViewsRange,
} from "@/repositories/content-view-report.repository";
import { type ViewsTopQuery, ViewsTopQuerySchema } from "@/schemas/admin-views";
import type { ViewsTopResponse } from "@/types/admin-views";

/** The ten most-viewed subjects of one type, over the same clamped window. */
export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.views.view" }),
	withValidation(ViewsTopQuerySchema, "query"),
)(async (_req, _ctx, { body }) => {
	const { type, from, to } = body as ViewsTopQuery;

	const response: ViewsTopResponse = {
		type,
		rows: await getTopSubjects(type, resolveViewsRange({ from, to })),
	};

	return json(response);
});
