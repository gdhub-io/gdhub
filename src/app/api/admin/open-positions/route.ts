import { z } from "zod";
import { json, pipe, withAuth, withValidation } from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { LISTING_STATES, POSITION_STATES } from "@/lib/vacancy/listing-state";
import { listAdminPositions } from "@/repositories/vacancy/admin";

const QuerySchema = z.object({
	search: z.string().max(200).optional(),
	state: z.enum(POSITION_STATES).optional(),
	listing: z.enum(LISTING_STATES).optional(),
	page: z.coerce.number().int().min(1).default(1),
	pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/** Every open position on the platform (frame 10.19). */
export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.vacancies.view" }),
	withValidation(QuerySchema, "query"),
)(async (_req, _ctx, { body }) =>
	json(await listAdminPositions(body as z.infer<typeof QuerySchema>)),
);
