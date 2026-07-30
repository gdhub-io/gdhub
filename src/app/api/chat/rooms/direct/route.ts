import { ChatRoomKind, UserRole } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { ensureChatRoom } from "@/services/chat/ensure-room";
import { inviteUserToRoom } from "@/services/matrix/admin";
import { NovuService } from "@/services/novu";
import { prisma } from "@/services/prisma";

// auth + server-side Matrix SDK — never prerender (also avoids loading
// matrix-js-sdk at build time, which trips its "Multiple entrypoints" guard)
export const dynamic = "force-dynamic";

const DirectChatSchema = z.object({
	toUserId: z.string().min(1),
});

type DirectChatBody = z.infer<typeof DirectChatSchema>;

// Generic 1:1 DM between two platform users. Creation is admin-gated for now —
// opening DMs to everyone later means relaxing this roles gate (and un-hiding
// the "New chat" button), nothing else.
export const POST = withAuth({
	mode: "user",
	roles: [UserRole.Admin],
})(
	withValidation(DirectChatSchema)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser;
		const { toUserId } = body as DirectChatBody;

		if (toUserId === currentUser.id) {
			return apiError.badRequest("Cannot start a chat with yourself");
		}

		const [initiator, target] = await Promise.all([
			prisma.user.findUnique({
				where: { id: currentUser.id },
				select: { id: true, name: true },
			}),
			prisma.user.findUnique({
				where: { id: toUserId },
				select: { id: true, email: true },
			}),
		]);

		if (!target?.email) {
			return apiError.badRequest("Target user not found or has no email");
		}

		// Deterministic pair key — the same two users always share one room, so
		// dedup happens here instead of scanning Matrix rooms client-side.
		const [minUserId, maxUserId] = [currentUser.id, toUserId].sort();

		// No title/avatar: for a 1:1 DM each side should see the OTHER participant.
		// Matrix computes the room name/avatar from the other member (heroes).
		const chat = await ensureChatRoom({
			kind: ChatRoomKind.Direct,
			directKey: `direct:${minUserId}:${maxUserId}`,
			isDirect: true,
			context: { userIds: [minUserId, maxUserId] },
			initiatorUserId: currentUser.id,
			inviteeUserIds: [toUserId],
		});

		// The registry dedups by pair — but if the recipient previously DECLINED
		// the invite (membership=leave), the existing room is dead for them.
		// Re-invite so the pair can always chat again; false = already in room.
		let reinvited = false;
		if (!chat.created) {
			try {
				reinvited = await inviteUserToRoom(
					currentUser.id,
					chat.roomId,
					toUserId,
				);
			} catch (error) {
				console.error("[chat/rooms/direct] re-invite failed", error);
			}
		}

		// notify the recipient about the new chat invitation (persistent in-app
		// inbox via Novu — independent of the Matrix push / live toast); on first
		// creation or a fresh re-invite, not on a plain re-open
		if (chat.created || reinvited) {
			try {
				await NovuService.send({
					template: "default-message",
					to: { subscriberId: target.id, email: target.email || undefined },
					payload: {
						title: "New chat invitation",
						message: `${initiator?.name || "Someone"} invited you to a chat.`,
						redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/hub?chat=1&roomId=${chat.roomId}`,
						redirectUrlType: "internal",
					},
				});
			} catch (error) {
				console.error(
					"[chat/rooms/direct] novu invite notification failed",
					error,
				);
			}
		}

		return json({ roomId: chat.roomId, created: chat.created });
	}),
);
