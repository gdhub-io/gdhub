import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import * as sdk from "matrix-js-sdk";
import { EventType } from "matrix-js-sdk";
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

		const target = await prisma.user.findUnique({
			where: { id: toUserId },
			select: { id: true, email: true, name: true, image: true },
		});

		if (!target?.email) {
			return apiError.badRequest("Target user not found or has no email");
		}

		// make sure both sides exist in Matrix
		const adminMatrixUser = await ensureMatrixUser(
			currentUser.id,
			currentUser.email,
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

		const room = await adminMatrixClient.createRoom({
			name: target.name || target.email,
			is_direct: true,
			invite: [targetMatrixUser.user_id],
		});

		if (target.image) {
			try {
				const avatarFile = await fetch(target.image).then((res) => res.blob());
				const uploaded = await adminMatrixClient.uploadContent(avatarFile, {
					type: avatarFile.type || "image/png",
					name: `dm-${target.id}-avatar`,
				});
				await adminMatrixClient.sendStateEvent(
					room.room_id,
					EventType.RoomAvatar,
					{ url: uploaded.content_uri || undefined },
				);
			} catch (error) {
				console.error("[chat/rooms/direct] avatar upload failed", error);
			}
		}

		return json({ roomId: room.room_id });
	}),
);
