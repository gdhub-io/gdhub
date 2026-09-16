import { CheckpointStatus } from "@gdhub-io/gdhub-prisma";
import { apiError, json, pipe, withAuth } from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { projectOfCheckpoint } from "@/lib/space-ids";
import { runGoalCheck } from "@/repositories/checkpoint-curator.repository";
import { prisma } from "@/services/prisma";

/**
 * Consultation 1: the curator reads the goal card back before the card is fixed.
 *
 * A `POST` because it may spend a model call and writes what came back. The read
 * is kept on the checkpoint and handed straight back while the plan behind it is
 * unchanged, so opening this step twice costs one call. Only a `Draft`: once the
 * 28 days are running the card is what the verdict is measured against, and
 * asking whether it fits then would only be cruel.
 */
export const POST = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "project.checkpoints.manage",
		idFrom: projectOfCheckpoint,
	}),
)(async (_req, ctx) => {
	const { id } = (await ctx.params) as { id: string };

	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id },
		select: { status: true },
	});

	if (!checkpoint) return apiError.notFound();
	if (checkpoint.status !== CheckpointStatus.Draft) {
		return apiError.badRequest("checkpointNotDraft");
	}

	const result = await runGoalCheck(id);
	if (!result) return apiError.unavailable("curatorUnavailable");

	return json(result);
});
