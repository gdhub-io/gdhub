import { CheckpointStatus } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import { json, pipe, withAuth, withValidation } from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { listAdminCheckpoints } from "@/repositories/checkpoint-refund";

const QuerySchema = z.object({
	status: z.nativeEnum(CheckpointStatus).optional(),
	q: z.string().trim().max(100).optional(),
	page: z.coerce.number().int().min(1).default(1),
});

export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.checkpoints.view" }),
	withValidation(QuerySchema, "query"),
)(async (_req, _ctx, { body }) => {
	const { status, q, page } = body as z.infer<typeof QuerySchema>;

	return json(await listAdminCheckpoints({ status, query: q, page }));
});
