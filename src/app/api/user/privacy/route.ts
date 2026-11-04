import { sessionUserCacheKey } from "@/auth";
import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { deleteBrevoContact } from "@/services/brevo/sync";
import { cacheDelete } from "@/services/cache";
import {
	collectUserChatRooms,
	deleteUserChats,
} from "@/services/chat/delete-user-chats";
import { deactivateMatrixUser } from "@/services/matrix/admin";
import { prisma } from "@/services/prisma";
import { eraseFromProviders } from "@/services/privacy/erase-external";

export const GET = withAuth({ mode: "user" })(async (req, _ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const requestedById = currentUser.id;

	try {
		const url = new URL(req.url);
		const action = url.searchParams.get("action") ?? undefined;
		const userId = url.searchParams.get("userId") ?? requestedById;
		const params = { userId, requestedById };

		if (action === "prepare-delete") {
			const preview = await prisma.user.prepareToDeletePersonalData(params);
			return json(preview);
		}

		if (action === "export") {
			const exportData = await prisma.user.exportPersonalData(params);
			return json(exportData);
		}

		return apiError.badRequest("Unsupported user privacy action");
	} catch (error) {
		console.error("[user/privacy] error", error);
		return apiError.internal();
	}
});

export const POST = withAuth({ mode: "user" })(async (req, _ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const requestedById = currentUser.id;

	try {
		const body = (await req.json().catch(() => ({}))) as {
			action?: string;
			userId?: string;
			reason?: string;
		};
		const { action, userId = requestedById, reason } = body;

		if (action === "delete-personal-data") {
			// Collect the user's chats BEFORE the deletion — the lookup needs domain
			// rows that deletePersonalData may cascade away.
			let chatRooms: Awaited<ReturnType<typeof collectUserChatRooms>> = [];
			try {
				chatRooms = await collectUserChatRooms(userId);
			} catch (error) {
				console.error("[user/privacy] chat collection failed", error);
			}

			// Read before it is wiped: the providers key the person by email, avatar
			// URL and speciality ids, and afterwards there is no way left to find them.
			const subject = await prisma.user.findUnique({
				where: { id: userId },
				select: {
					email: true,
					image: true,
					specialities: { select: { id: true } },
				},
			});
			const email = subject?.email;

			const result = await prisma.user.deletePersonalData({
				userId,
				requestedById,
				reason,
			});

			// A deleted user takes their chats with them (registry + Matrix rooms),
			// then the Matrix account is erased. Best-effort — the platform deletion
			// above is already done and must not be rolled back by chat failures.
			try {
				await deleteUserChats(chatRooms);
			} catch (error) {
				console.error("[user/privacy] chat cleanup failed", error);
			}
			try {
				await deactivateMatrixUser(userId);
			} catch (error) {
				console.error("[user/privacy] matrix deactivation failed", error);
			}
			await Promise.all([
				email ? deleteBrevoContact(email) : null,
				eraseFromProviders({
					userId,
					email: email ?? null,
					image: subject?.image ?? null,
					specialityIds: subject?.specialities.map(({ id }) => id) ?? [],
				}),
				// The session snapshot is cached by email; dropping it makes the next sync see the erasure.
				email ? cacheDelete(sessionUserCacheKey(email)) : null,
			]);

			return json(result);
		}

		return apiError.badRequest("Unsupported user privacy action");
	} catch (error) {
		console.error("[user/privacy] error", error);
		return apiError.internal();
	}
});
