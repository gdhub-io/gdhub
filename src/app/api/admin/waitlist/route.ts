import { z } from "zod";
import { WaitlistFeature } from "@/config/prisma-enums";
import { json, pipe, withAuth, withValidation } from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { listWaitlist } from "@/repositories/feature-waitlist";

const QuerySchema = z.object({
	feature: z.nativeEnum(WaitlistFeature),
	q: z.string().trim().max(100).optional(),
});

/** Frame 13.8: who waits for a feature, for the admin to decide when to open it. */
export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.checkpoints.view" }),
	withValidation(QuerySchema, "query"),
)(async (_req, _ctx, { body }) => {
	const { feature, q } = body as z.infer<typeof QuerySchema>;
	return json(await listWaitlist(feature, q));
});
