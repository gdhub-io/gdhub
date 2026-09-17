import { CheckpointStatus } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { dueDateFrom } from "@/lib/checkpoint-days";
import { prisma } from "@/services/prisma";

const AnswerSchema = z.object({ accept: z.boolean() });

/** A date already gone cannot be day one; the author's wish holds otherwise. */
const startsOn = (wanted: Date | null) => {
	const today = new Date();
	const midnight = new Date(
		Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
	);

	return wanted && wanted > midnight ? wanted : midnight;
};

/**
 * The curator answering a checkpoint that was paid for and handed to them.
 *
 * Not behind the space guard: a curator is not a member of the project they are
 * curating, so the right to answer comes from being the person named on the
 * checkpoint and from nothing else.
 *
 * Accepting is what starts the 28 days — payment only put the checkpoint in the
 * queue. Declining hands it back to the author with the curator cleared; the
 * money stays paid and the refund, if the author wants one, is an admin action.
 */
export const POST = pipe(
	withAuth({ mode: "user" }),
	withValidation(AnswerSchema, "body"),
)(async (_req, ctx, { user, body }) => {
	const curator = user as SessionUser | undefined;
	if (!curator) return apiError.unauthorized();

	const { id } = (await ctx.params) as { id: string };
	const { accept } = body as z.infer<typeof AnswerSchema>;

	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id },
		select: { status: true, curatorId: true, startedAt: true },
	});

	if (!checkpoint) return apiError.notFound();
	if (checkpoint.curatorId !== curator.id) return apiError.forbidden();

	// Answering twice is not an error the curator can see the difference of, but
	// it must not restart a checkpoint that is already running.
	if (checkpoint.status !== CheckpointStatus.AwaitingCurator) {
		return apiError.badRequest("checkpointNotAwaiting");
	}

	const startedAt = startsOn(checkpoint.startedAt);

	await prisma.projectCheckpoint.update({
		where: { id },
		data: accept
			? {
					status: CheckpointStatus.Active,
					curatorAcceptedAt: new Date(),
					startedAt,
					dueAt: dueDateFrom(startedAt),
				}
			: {
					status: CheckpointStatus.Draft,
					curatorDeclinedAt: new Date(),
					curatorId: null,
				},
	});

	return json({ accepted: accept });
});
