import { z } from "zod";
import {
	apiError,
	json,
	pipe,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import {
	askedInSpeciality,
	countAdvisorRequests,
	isRequestFilter,
	listAdvisorRequests,
} from "@/repositories/advisor/requests";

const QuerySchema = z.object({
	filter: z.string().refine(isRequestFilter).optional(),
	search: z.string().optional(),
	page: z.coerce.number().int().min(1).optional(),
	limit: z.coerce.number().int().min(1).max(50).optional(),
});

type Query = z.infer<typeof QuerySchema>;

/** Counts ride with the page: fetched apart, the filters paint without them. */
export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "advisor.requests.view" }),
	withValidation(QuerySchema, "query"),
)(async (_req, _ctx, { user, body }) => {
	if (!user) return apiError.unauthorized();

	const { filter, search, page, limit } = body as Query;

	const [requests, counts, askedIn] = await Promise.all([
		listAdvisorRequests(user.id, { filter, search, page, limit }),
		countAdvisorRequests(user.id),
		askedInSpeciality(user.id),
	]);

	return json({ ...requests, counts, askedIn });
});
