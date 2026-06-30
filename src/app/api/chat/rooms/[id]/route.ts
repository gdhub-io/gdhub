import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { getChatProvider } from "@/services/chat/providers";
import { prisma } from "@/services/prisma";
import { adviceRequestSelect, buildAdviceRequestContext } from "../_helpers";

export const GET = withAuth({ mode: "user" })(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { id: matrixRoomId } = (await ctx.params) as { id: string };

	// Unified registry: ChatRoom row -> kind -> context provider.
	const room = await prisma.chatRoom.findUnique({
		where: { matrixRoomId },
		select: {
			id: true,
			kind: true,
			status: true,
			finishedAt: true,
			context: true,
		},
	});

	if (room) {
		const provider = getChatProvider(room.kind);
		if (provider) {
			return json(await provider.buildContext(room, currentUser.id));
		}
		return json({ type: "default", data: null });
	}

	// Legacy: advice-request chats still link via AdviceRequest.matrixRoomId.
	const adviceRequest = await prisma.adviceRequest.findFirst({
		where: { matrixRoomId },
		select: adviceRequestSelect,
	});

	if (adviceRequest) {
		return json(buildAdviceRequestContext(adviceRequest, currentUser.id));
	}

	return json({ type: "default", data: null });
});
