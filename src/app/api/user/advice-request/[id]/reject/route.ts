import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { NovuService } from "@/services/novu";
import { prisma } from "@/services/prisma";

export const PUT = withAuth({ mode: "user" })(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { id } = (await ctx.params) as { id: string };

	const adviceRequest = await prisma.adviceRequest.findUnique({
		where: { id },
		select: {
			toUserId: true,
		},
	});

	if (!adviceRequest || adviceRequest.toUserId !== currentUser.id) {
		return apiError.badRequest(
			"Advice request not found or you are not the expert",
		);
	}

	const updatedAdviceRequest = await prisma.adviceRequest.update({
		where: { id },
		data: {
			status: prismaClient.AdviceRequestStatus.Rejected,
			finishedAt: new Date(),
		},
		include: {
			fromUser: true,
			toUser: true,
		},
	});

	// send a notification to the user
	try {
		await NovuService.send({
			template: "default-message",
			to: {
				// biome-ignore lint/style/noNonNullAssertion: original semantics
				subscriberId: updatedAdviceRequest.fromUserId!,
				email: updatedAdviceRequest.fromUser?.email || undefined,
			},
			payload: {
				title: "Advice request rejected",
				message: `Advice request to ${updatedAdviceRequest.toUser?.name} was rejected.`,
				redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/hub/experts/my-requests`,
				redirectUrlType: "internal",
			},
		});
	} catch (error) {
		console.error("[NovuService]", error);
	}

	return json(updatedAdviceRequest);
});
