import { apiError, json, pipe, withAuth } from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { getAdminPositionApplications } from "@/repositories/vacancy/admin";

/** One position's applications, read-only (frame 10.20). */
export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.vacancies.view" }),
)(async (_req, ctx) => {
	const { id } = (await ctx.params) as { id: string };
	const position = await getAdminPositionApplications(id);
	if (!position) return apiError.notFound("Position not found");
	return json(position);
});
