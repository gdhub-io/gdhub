import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { EventType } from "matrix-js-sdk";
import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { MatrixService } from "@/services/matrix";
import { ensureMatrixUser, getMatrixUserToken } from "@/services/matrix-admin";
import { NovuService } from "@/services/novu";
import { prisma } from "@/services/prisma";

export const PUT = withAuth({ mode: "user" })(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { id } = (await ctx.params) as { id: string };

	const adviceRequest = await prisma.adviceRequest.findUnique({
		where: { id },
		select: {
			id: true,
			topic: true,
			project: true,
			comment: true,
			toUser: true,
			fromUser: true,
		},
	});

	if (
		!adviceRequest ||
		adviceRequest.toUser.id !== currentUser.id ||
		!adviceRequest.fromUser
	) {
		return apiError.badRequest(
			"Advice request not found or you are not the expert",
		);
	}

	// ensure that the expert has a matrix session
	const userMatrixUser = await ensureMatrixUser(
		adviceRequest.fromUser.id,
		// biome-ignore lint/style/noNonNullAssertion: original semantics
		adviceRequest.fromUser.email!,
	);
	const expertMatrixUser = await ensureMatrixUser(
		adviceRequest.toUser.id,
		// biome-ignore lint/style/noNonNullAssertion: original semantics
		adviceRequest.toUser.email!,
	);
	const expertSession = await getMatrixUserToken(adviceRequest.toUser?.id);

	// create a chat between the user and the expert
	const expertMatrixClient = MatrixService.getInstance().init({
		userId: expertMatrixUser.user_id,
		accessToken: expertSession.accessToken,
	});

	// create a chat and invite the user
	const adviceRequestRoom = await expertMatrixClient.createRoom({
		room_alias_name: `advreq-${adviceRequest.id}`,
		name: `${adviceRequest.project?.name}`,
		topic: adviceRequest.topic || undefined,
		is_direct: true,
		invite: [userMatrixUser.user_id],
	});

	if (adviceRequest.project?.coverImage) {
		const coverImageFile = await fetch(adviceRequest.project?.coverImage).then(
			(res) => res.blob(),
		);

		const roomAvatar = await expertMatrixClient.uploadContent(coverImageFile, {
			type: "image/png",
			name: `room-${adviceRequest.id}-avatar.png`,
		});

		await expertMatrixClient.sendStateEvent(
			adviceRequestRoom.room_id,
			EventType.RoomAvatar,
			{
				url: roomAvatar.content_uri || undefined,
			},
		);
	}

	const updatedAdviceRequest = await prisma.adviceRequest.update({
		where: { id },
		data: {
			status: prismaClient.AdviceRequestStatus.Approved,
			matrixRoomId: adviceRequestRoom.room_id,
		},
		include: {
			fromUser: true,
			toUser: true,
			project: true,
		},
	});

	// send a notification to the user
	try {
		await NovuService.send({
			template: "default-message",
			to: {
				// biome-ignore lint/style/noNonNullAssertion: original semantics
				subscriberId: updatedAdviceRequest.fromUserId!,
				email: adviceRequest.fromUser?.email || undefined,
			},
			payload: {
				title: "Advice request accepted",
				message: `Advice request to ${updatedAdviceRequest.toUser?.name} was accepted. Start a chat with the expert to discuss the details.`,
				redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/hub/experts/my-requests`,
				redirectUrlType: "internal",
			},
		});
	} catch (error) {
		console.error("[NovuService]", error);
	}

	return json(updatedAdviceRequest);
});
