import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { getChatProvider } from "@/services/chat/providers";
import { makeRoomReadOnly } from "@/services/matrix/admin";
import { NovuService } from "@/services/novu";
import { prisma } from "@/services/prisma";

const roomSelect = {
	id: true,
	kind: true,
	status: true,
	finishedAt: true,
	context: true,
} as const;

// Notify everyone in the chat except the closer. Best-effort.
async function notifyChatClosed(
	participantIds: string[],
	closedByUserId: string,
	matrixRoomId: string,
) {
	const counterpartIds = participantIds.filter((id) => id !== closedByUserId);
	if (counterpartIds.length === 0) return;

	const users = await prisma.user.findMany({
		where: { id: { in: counterpartIds } },
		select: { id: true, email: true },
	});

	await Promise.all(
		users.map((u) =>
			NovuService.send({
				template: "default-message",
				to: { subscriberId: u.id, email: u.email || undefined },
				payload: {
					title: "Chat closed",
					message:
						"The conversation was closed by the other participant. The history stays available in your chats.",
					redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/hub?chat=1&roomId=${matrixRoomId}`,
					redirectUrlType: "internal",
				},
			}),
		),
	);
}

export const PUT = withAuth({ mode: "user" })(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { id: matrixRoomId } = (await ctx.params) as { id: string };

	const room = await prisma.chatRoom.findUnique({
		where: { matrixRoomId },
		select: roomSelect,
	});
	if (!room) return apiError.notFound("Chat not found");

	const provider = getChatProvider(room.kind);
	if (!provider) return apiError.notFound("Chat not found");

	const loaded = await provider.load(room);
	if (!provider.canClose(room, loaded, currentUser.id)) {
		return apiError.forbidden();
	}

	let closedRoom = room;
	if (room.status !== prismaClient.ChatRoomStatus.Closed) {
		const finishedAt = new Date();
		await prisma.chatRoom.update({
			where: { id: room.id },
			data: { status: prismaClient.ChatRoomStatus.Closed, finishedAt },
		});
		closedRoom = {
			...room,
			status: prismaClient.ChatRoomStatus.Closed,
			finishedAt,
		};

		// Sync the domain entity (e.g. AdviceRequest.status).
		try {
			await provider.onClose?.(room);
		} catch (error) {
			console.error("[chat] onClose sync failed", error);
		}

		// Closed chats stay readable but nobody can post (decision #3).
		try {
			await makeRoomReadOnly(matrixRoomId);
		} catch (error) {
			console.error("[chat] makeRoomReadOnly failed", error);
		}

		try {
			const participantIds = provider.participantIds?.(room, loaded) ?? [];
			await notifyChatClosed(participantIds, currentUser.id, matrixRoomId);
		} catch (error) {
			console.error("[chat] close notification failed", error);
		}
	}

	// onClose may have changed the domain entity (e.g. advice status) — reload
	// only when a close actually happened.
	const closedLoaded =
		closedRoom === room ? loaded : await provider.load(closedRoom);

	return json(provider.buildContext(closedRoom, closedLoaded, currentUser.id));
});
