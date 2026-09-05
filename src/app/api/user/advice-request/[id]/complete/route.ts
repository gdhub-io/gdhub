import { AdviceRequestStatus } from "@gdhub-io/gdhub-prisma";
import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

/**
 * The advisor marks an accepted question answered.
 *
 * `Executed` already meant advice given — person-card, skill-capital and the
 * admin user list all count it — but nothing ever wrote it. Only `Approved`
 * may move.
 */
export const PUT = withAuth({ mode: "user" })(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { id } = (await ctx.params) as { id: string };

	const adviceRequest = await prisma.adviceRequest.findUnique({
		where: { id },
		select: { toUserId: true, status: true },
	});

	if (!adviceRequest || adviceRequest.toUserId !== currentUser.id) {
		return apiError.notFound("Advice request not found");
	}

	if (adviceRequest.status !== AdviceRequestStatus.Approved) {
		return apiError.badRequest("Only an accepted request can be marked done");
	}

	const updated = await prisma.adviceRequest.update({
		where: { id },
		data: {
			status: AdviceRequestStatus.Executed,
			finishedAt: new Date(),
		},
		select: { id: true, status: true, finishedAt: true },
	});

	return json(updated);
});
