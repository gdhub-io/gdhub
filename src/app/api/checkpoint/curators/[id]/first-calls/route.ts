import { json, pipe, withAuth, withValidation } from "@/lib/api-handlers";
import { freeFirstCallsFor } from "@/repositories/advisor-availability";
import { FirstCallsQuerySchema } from "@/schemas/advisor-availability";

/**
 * The first calls a checkpoint could book with this curator between two of
 * their days: each opens five free weekly calls. Only the instants leave the
 * server — the curator's hours themselves stay theirs.
 */
export const GET = pipe(
	withAuth({ mode: "user" }),
	withValidation(FirstCallsQuerySchema, "query"),
)(async (_req, ctx, { body }) => {
	const { id } = (await ctx.params) as { id: string };
	const { from, to } = body as { from: string; to: string };

	return json(await freeFirstCallsFor(id, from, to));
});
