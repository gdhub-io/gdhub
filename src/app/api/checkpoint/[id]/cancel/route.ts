import { apiError, json, pipe, withAuth } from "@/lib/api-handlers";
import { isPending } from "@/lib/checkpoints/status";
import { withSpaceGuard } from "@/lib/space-guard";
import { projectOfCheckpoint } from "@/lib/space-ids";
import {
	checkpointStatusOf,
	deletePendingCheckpoint,
} from "@/repositories/checkpoints/checkpoint";
import { returnCheckpointMoney } from "@/services/checkpoints/flows/payment";

/**
 * Calling off a checkpoint that has not started, and returning the money if
 * there was any.
 *
 * Only before day one. Once the 28 days run the author has had consultations
 * and a curator has spent time, and what is owed back is a conversation rather
 * than a button.
 *
 * What happens to the money depends on whether it has moved. A checkpoint
 * waiting for its curator is only holding it, so the hold is let go and nothing
 * was ever charged; one whose curator accepted has been charged, and that is a
 * refund with a fee behind it.
 *
 * Either way Stripe is asked first and the row written second: a row saying
 * `REFUNDED` that Stripe never agreed to would be a lie in our own records.
 *
 * The checkpoint is then deleted rather than kept as `Cancelled`: it never ran,
 * there is nothing to look back at, and a row in the project's history saying a
 * purchase was undone is noise. The payment and its refund stay — the money
 * moved, and that is the part worth keeping.
 */
export const POST = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "project.checkpoints.manage",
		idFrom: projectOfCheckpoint,
	}),
)(async (_req, ctx) => {
	const { id } = (await ctx.params) as { id: string };

	const checkpoint = await checkpointStatusOf(id);

	if (!checkpoint) return apiError.notFound();
	if (!isPending(checkpoint.status)) {
		return apiError.badRequest("checkpointRunning");
	}

	const returned = await returnCheckpointMoney(id, "checkpointCancelled");

	if (returned && "failed" in returned)
		return apiError.internal(returned.failed);

	// A curator's yes landing meanwhile has started it: it is no longer this button's to undo.
	if (!(await deletePendingCheckpoint(id))) {
		return apiError.badRequest("checkpointRunning");
	}

	return json({
		refunded: returned?.refunded ?? false,
		released: returned?.released ?? false,
	});
});
