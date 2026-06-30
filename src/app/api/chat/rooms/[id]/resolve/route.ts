import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { getChatProvider } from "@/services/chat/providers";
import { prisma } from "@/services/prisma";
import { adviceRequestSelect, buildAdviceRequestContext } from "../../_helpers";

const roomSelect = {
	id: true,
	kind: true,
	status: true,
	finishedAt: true,
	context: true,
} as const;

export const PUT = withAuth({ mode: "user" })(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { id: matrixRoomId } = (await ctx.params) as { id: string };

	// Unified registry path.
	const room = await prisma.chatRoom.findUnique({
		where: { matrixRoomId },
		select: roomSelect,
	});

	if (room) {
		const provider = getChatProvider(room.kind);
		if (!provider) return apiError.notFound("Chat not found");

		if (!(await provider.canClose(room, currentUser.id))) {
			return apiError.forbidden();
		}

		if (room.status !== prismaClient.ChatRoomStatus.Closed) {
			await prisma.chatRoom.update({
				where: { id: room.id },
				data: {
					status: prismaClient.ChatRoomStatus.Closed,
					finishedAt: new Date(),
				},
			});
		}

		const updated = await prisma.chatRoom.findUnique({
			where: { id: room.id },
			select: roomSelect,
		});

		return json(await provider.buildContext(updated ?? room, currentUser.id));
	}

	// Legacy: advice-request chats.
	const adviceRequest = await prisma.adviceRequest.findFirst({
		where: { matrixRoomId },
		select: adviceRequestSelect,
	});

	if (!adviceRequest) {
		return apiError.notFound("Chat not found");
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
