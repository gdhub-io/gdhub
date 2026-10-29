import { z } from "zod";
import { json, pipe, withAuth, withValidation } from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { listCurators } from "@/repositories/checkpoints/curator-approval";

const QuerySchema = z.object({
	pending: z
		.enum(["true", "false"])
		.optional()
		.transform((value) => value === "true"),
	q: z.string().trim().max(100).optional(),
});

/** Frame 13.7a: the experts who asked to curate, waiting first. */
export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.curators.view" }),
	withValidation(QuerySchema, "query"),
)(async (_req, _ctx, { body }) => {
	const { pending, q } = body as z.infer<typeof QuerySchema>;
	return json(await listCurators({ pending, query: q }));
});
