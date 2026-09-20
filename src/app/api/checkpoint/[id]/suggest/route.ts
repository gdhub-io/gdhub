import { CheckpointStatus } from "@gdhub-io/gdhub-prisma";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { projectOfCheckpoint } from "@/lib/space-ids";
import { suggestCardLines } from "@/repositories/checkpoint-curator.repository";
import {
	type CheckpointSuggestBody,
	CheckpointSuggestSchema,
} from "@/schemas/checkpoint";
import { prisma } from "@/services/prisma";

/**
 * Lines for one side of the goal card, for an author staring at an empty list.
 *
 * It suggests, it never writes: the lines come back in the response and land in
 * the form, where they are edited or thrown away. Only a `Draft` — suggesting is
 * part of writing the card, and the card is fixed once it is bought.
 */
export const POST = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "project.checkpoints.manage",
		idFrom: projectOfCheckpoint,
	}),
	withValidation(CheckpointSuggestSchema),
)(async (_req, ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	const { id } = (await ctx.params) as { id: string };
	const { kind } = body as CheckpointSuggestBody;

	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id },
		select: { status: true },
	});

	if (!checkpoint) return apiError.notFound();
	if (checkpoint.status !== CheckpointStatus.Draft) {
		return apiError.badRequest("checkpointNotDraft");
	}

	const result = await suggestCardLines(id, kind, {
		locale: currentUser?.lang || "en",
	});
	if (!result) return apiError.unavailable("curatorUnavailable");

	return json(result);
});
