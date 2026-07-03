import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { getChatProvider } from "@/services/chat/providers";
import { prisma } from "@/services/prisma";

export const GET = withAuth({ mode: "user" })(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { id: matrixRoomId } = (await ctx.params) as { id: string };

	// Unified registry: ChatRoom row -> kind -> context provider. Legacy advice
	// rooms were imported via scripts/backfill-advice-chatrooms.mjs, so every
	// known room resolves here; anything else is a plain default chat.
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
			const loaded = await provider.load(room);
			return json(provider.buildContext(room, loaded, currentUser.id));
		}
	}

	return json({ type: "default", data: null });
});
