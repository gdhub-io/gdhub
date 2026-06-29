import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import * as sdk from "matrix-js-sdk";
import { z } from "zod";
import { env } from "@/helpers/env";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { ensureMatrixUser, getMatrixUserToken } from "@/services/matrix/admin";
import { NovuService } from "@/services/novu";
import { prisma } from "@/services/prisma";

// auth + server-side Matrix SDK — never prerender (also avoids loading
// matrix-js-sdk at build time, which trips its "Multiple entrypoints" guard)
export const dynamic = "force-dynamic";

const DirectChatSchema = z.object({
	toUserId: z.string().min(1),
});

type DirectChatBody = z.infer<typeof DirectChatSchema>;

export const POST = withAuth({
	mode: "user",
	roles: [prismaClient.UserRole.Admin],
})(
	withValidation(DirectChatSchema)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser;
		const { toUserId } = body as DirectChatBody;

		if (toUserId === currentUser.id) {
			return apiError.badRequest("Cannot start a chat with yourself");
		}

		const [admin, target] = await Promise.all([
			prisma.user.findUnique({
				where: { id: currentUser.id },
				select: { id: true, email: true, name: true, image: true },
			}),
			prisma.user.findUnique({
				where: { id: toUserId },
				select: { id: true, email: true, name: true, image: true },
			}),
		]);

		if (!target?.email) {
			return apiError.badRequest("Target user not found or has no email");
		}

		// make sure both sides exist in Matrix — with display name + avatar so the
		// other participant sees a proper name/picture in the auto-named DM
		const adminMatrixUser = await ensureMatrixUser(
			currentUser.id,
			admin?.email || currentUser.email,
			admin?.name || undefined,
			admin?.image || undefined,
		);
		const targetMatrixUser = await ensureMatrixUser(
			target.id,
			target.email,
			target.name || undefined,
			target.image || undefined,
		);

		const adminSession = await getMatrixUserToken(currentUser.id);

		// fresh client per request — avoids the shared MatrixService singleton
		// caching another user's token across requests
		const adminMatrixClient = sdk.createClient({
			baseUrl: env("MATRIX_CHAT_BASE_URL"),
			accessToken: adminSession.accessToken,
			userId: adminMatrixUser.user_id,
			deviceId: adminSession.deviceId,
		});

		// No explicit room name/avatar: for a 1:1 DM each side should see the OTHER
		// participant. Matrix computes the room name/avatar from the other member
		// (heroes), so a shared name set to one user would otherwise make that user
		// see a chat named after themselves.
		const room = await adminMatrixClient.createRoom({
			is_direct: true,
			invite: [targetMatrixUser.user_id],
		});

		// notify the recipient about the new chat invitation (persistent in-app
		// inbox via Novu — independent of the Matrix push / live toast)
		try {
			await NovuService.send({
				template: "default-message",
				to: { subscriberId: target.id, email: target.email || undefined },
				payload: {
					title: "New chat invitation",
					message: `${admin?.name || "Someone"} invited you to a chat.`,
					redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/hub?chat=1&roomId=${room.room_id}`,
					redirectUrlType: "internal",
				},
			});
		} catch (error) {
			console.error(
				"[chat/rooms/direct] novu invite notification failed",
				error,
			);
		}

		return json({ roomId: room.room_id });
	}),
);
