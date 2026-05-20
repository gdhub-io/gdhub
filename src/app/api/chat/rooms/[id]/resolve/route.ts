import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";
import { adviceRequestSelect, buildAdviceRequestContext } from "../../_helpers";

export const PUT = withAuth({ mode: "user" })(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { id: matrixRoomId } = (await ctx.params) as { id: string };

	const adviceRequest = await prisma.adviceRequest.findFirst({
		where: { matrixRoomId },
		select: adviceRequestSelect,
	});

	if (!adviceRequest) {
		return apiError.notFound("Advice request not found");
	}

	const isParticipant =
		adviceRequest.fromUserId === currentUser.id ||
		adviceRequest.toUserId === currentUser.id;

	if (!isParticipant) {
		return apiError.forbidden();
	}

	if (adviceRequest.status === prismaClient.AdviceRequestStatus.Closed) {
		return json(buildAdviceRequestContext(adviceRequest, currentUser.id));
	}

	const updatedAdviceRequest = await prisma.adviceRequest.update({
		where: { id: adviceRequest.id },
		data: {
			status: prismaClient.AdviceRequestStatus.Closed,
			finishedAt: new Date(),
		},
		select: adviceRequestSelect,
	});

	return json(buildAdviceRequestContext(updatedAdviceRequest, currentUser.id));
});
