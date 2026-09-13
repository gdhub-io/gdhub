import { CheckpointItemKind, CheckpointStatus } from "@gdhub-io/gdhub-prisma";
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
import {
	getCheckpoint,
	replaceCheckpointItems,
	withProgress,
} from "@/repositories/checkpoint.repository";
import {
	type UpdateCheckpointBody,
	UpdateCheckpointSchema,
} from "@/schemas/checkpoint";
import { prisma } from "@/services/prisma";

/**
 * The space is resolved from the checkpoint itself, so a checkpoint id from one
 * project cannot be paired with a project id from another.
 */

export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "project.checkpoints.view",
		idFrom: projectOfCheckpoint,
	}),
)(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const { id } = (await ctx.params) as { id: string };
	const checkpoint = await getCheckpoint(id);

	if (!checkpoint) return apiError.notFound();

	return json(withProgress(checkpoint));
});

/**
 * A step of the start flow, saved as it is left. Only a `Draft` accepts it: once
 * the 28 days are running the goal card is what the verdict is judged against,
 * and the only way it moves after that is the day-14 scope change.
 */
export const PUT = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "project.checkpoints.manage",
		idFrom: projectOfCheckpoint,
	}),
	withValidation(UpdateCheckpointSchema),
)(async (_req, ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const { id } = (await ctx.params) as { id: string };
	const { goal, curatorKind, inputs, outcomes } = body as UpdateCheckpointBody;

	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id },
		select: { status: true },
	});

	if (!checkpoint) return apiError.notFound();
	if (checkpoint.status !== CheckpointStatus.Draft) {
		return apiError.badRequest("checkpointNotDraft");
	}

	if (goal !== undefined || curatorKind !== undefined) {
		await prisma.projectCheckpoint.update({
			where: { id },
			data: {
				...(goal !== undefined && { goal }),
				...(curatorKind && { curatorKind }),
			},
		});
	}

	if (inputs) {
		await replaceCheckpointItems(id, CheckpointItemKind.Input, inputs);
	}

	if (outcomes) {
		await replaceCheckpointItems(id, CheckpointItemKind.Outcome, outcomes);
	}

	return json(withProgress(await getCheckpoint(id)));
});

/**
 * Throws the draft away. Only a `Draft` — a checkpoint that has been paid for
 * goes to a verdict, because a deadline you can call off is not a deadline.
 */
export const DELETE = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "project.checkpoints.manage",
		idFrom: projectOfCheckpoint,
	}),
)(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const { id } = (await ctx.params) as { id: string };

	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id },
		select: { status: true },
	});

	if (!checkpoint) return apiError.notFound();
	if (checkpoint.status !== CheckpointStatus.Draft) {
		return apiError.badRequest("checkpointNotDraft");
	}

	await prisma.projectCheckpoint.delete({ where: { id } });

	return json({ success: true });
});
