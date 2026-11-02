import { AdviceRequestStatus } from "@gdhub-io/gdhub-prisma";
import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { NovuService } from "@/services/novu";
import { prisma } from "@/services/prisma";

export const PUT = withAuth({ mode: "user" })(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { id } = (await ctx.params) as { id: string };

	// Only the person who asked withdraws a request.
	const own = await prisma.adviceRequest.count({
		where: { id, fromUserId: currentUser.id },
	});
	if (!own) return apiError.notFound();

	const adviceRequest = await prisma.adviceRequest.update({
		where: { id },
		data: {
			status: AdviceRequestStatus.Closed,
			finishedAt: new Date(),
		},
		include: {
			toUser: true,
			project: true,
		},
	});

	// send a notification to the expert
	try {
		await NovuService.send({
			template: "default-message",
			to: {
				subscriberId: adviceRequest.toUserId,
				email: adviceRequest.toUser?.email || undefined,
			},
			payload: {
				title: "Advice request canceled",
				message: `Advice request from ${adviceRequest.project?.name} was canceled.`,
				redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/user/advice-requests`,
				redirectUrlType: "internal",
			},
		});
	} catch (error) {
		console.error("[NovuService]", error);
	}

	return json(adviceRequest);
});
