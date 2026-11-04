import { z } from "zod";
import {
	apiError,
	json,
	pipe,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { payoutDetails } from "@/repositories/checkpoints/payouts";
import type { PayoutDetailsDto } from "@/types/checkpoints";

const QuerySchema = z.object({ curatorId: z.string().min(1) });

/** The full account, for the Mark paid dialog only: the list shows it masked. */
export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.payouts.manage" }),
	withValidation(QuerySchema, "query"),
)(async (_req, _ctx, { body }) => {
	const { curatorId } = body as z.infer<typeof QuerySchema>;
	const seenAt = new Date().toISOString();
	const profile = await payoutDetails(curatorId);
	if (!profile) return apiError.notFound();

	return json({
		holder: profile.payoutHolder,
		account: profile.payoutAccount,
		invoicing: profile.invoicing,
		seenAt,
	} satisfies PayoutDetailsDto);
});
