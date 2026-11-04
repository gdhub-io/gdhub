import { json, pipe, withAuth, withValidation } from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import {
	getViewsReport,
	resolveViewsRange,
} from "@/repositories/content/view-report";
import {
	type ViewsReportQuery,
	ViewsReportQuerySchema,
} from "@/schemas/admin-views";

/**
 * The content-view report: per-type totals, the previous period, and the daily
 * series for the whole window.
 *
 * A range reaching past retention is clamped rather than rejected — the picker
 * offers a 90-day preset and the horizon moves every midnight, so the two are
 * always one race apart. `clamped` in the payload is how the client finds out.
 */
export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.views.view" }),
	withValidation(ViewsReportQuerySchema, "query"),
)(async (_req, _ctx, { body }) => {
	const query = body as ViewsReportQuery;

	return json(await getViewsReport(resolveViewsRange(query)));
});
