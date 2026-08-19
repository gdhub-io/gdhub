import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { ensureMatrixUser } from "@/services/matrix/admin";
import {
	forgetMatrixUserToken,
	getMatrixUserToken,
	revokeMatrixUserToken,
} from "@/services/matrix/session";
import { prisma } from "@/services/prisma";

const MatrixSessionSchema = z.object({
	deviceId: z.string().optional(),
});

type MatrixSessionBody = z.infer<typeof MatrixSessionSchema>;

export const POST = withAuth({ mode: "user" })(
	withValidation(MatrixSessionSchema)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const { deviceId } = body as MatrixSessionBody;

		const fullUser = await prisma.user.findUnique({
			where: { id: currentUser.id },
			include: { profile: true },
		});

		if (!fullUser) return apiError.notFound("User not found");
		if (!fullUser.email) return apiError.notFound("User email is not set");

		let matrixUserId = fullUser.matrixUserId;
		const displayName = fullUser.profile?.name || fullUser.name || undefined;
		const avatarUrl = fullUser.image || undefined;

		if (!matrixUserId) {
			const existingMatrixUser = await ensureMatrixUser(
				fullUser.id,
				fullUser.email,
				displayName,
				avatarUrl,
			);

			if (existingMatrixUser.user_id) {
				matrixUserId = existingMatrixUser.user_id;
				await prisma.user.update({
					where: { id: currentUser.id },
					data: { matrixUserId: existingMatrixUser.user_id },
				});
			}
		}

		if (!matrixUserId) {
			return apiError.notFound("Matrix user could not be provisioned");
		}

		let token: Awaited<ReturnType<typeof getMatrixUserToken>>;
		try {
			token = await getMatrixUserToken(currentUser.id, deviceId);
		} catch (error) {
			// The platform row can point at a Matrix account that no longer exists
			// on this homeserver (e.g. a re-created local Synapse). Re-provision
			// the account and retry once instead of handing out dead sessions.
			console.warn("[chat/session] token mint failed, re-provisioning", error);
			await ensureMatrixUser(
				fullUser.id,
				fullUser.email,
				displayName,
				avatarUrl,
			);
			token = await getMatrixUserToken(currentUser.id, deviceId);
		}

		return json({
			userId: matrixUserId,
			token: token.accessToken,
			deviceId: token.deviceId,
		});
	}),
);

const EndSessionSchema = z.object({
	deviceId: z.string().min(1),
	/**
	 * The token the browser holds. Revoking must not depend on the Redis cache
	 * still having it — no worse than the client calling Synapse's own
	 * `/logout` with the token it already owns.
	 */
	token: z.string().min(1).optional(),
	/**
	 * The homeserver already rejected the token — revoking it would only 401.
	 * Drop the cached copy so the next sign-in mints a fresh one.
	 */
	expired: z.boolean().optional(),
});

type EndSessionBody = z.infer<typeof EndSessionSchema>;

/**
 * End the browser's Matrix session: revoke the access token on the homeserver
 * so signing out of GDHub actually ends chat access too. Best-effort — a dead
 * homeserver must never block sign-out.
 */
export const DELETE = withAuth({ mode: "user" })(
	withValidation(EndSessionSchema)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const { deviceId, token, expired } = body as EndSessionBody;

		try {
			if (expired) {
				await forgetMatrixUserToken(currentUser.id, deviceId);
			} else {
				await revokeMatrixUserToken(currentUser.id, deviceId, token);
			}
		} catch (error) {
			console.error("[chat/session] revoke failed", error);
		}

		return json({ ok: true });
	}),
);
