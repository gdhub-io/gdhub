import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { ensureMatrixUser, getMatrixUserToken } from "@/services/matrix/admin";
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

		if (!matrixUserId) {
			const displayName = fullUser.profile?.name || fullUser.name || undefined;
			const avatarUrl = fullUser.image || undefined;

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

		const token = await getMatrixUserToken(currentUser.id, deviceId);

		return json({
			userId: matrixUserId,
			token: token.accessToken,
			deviceId: token.deviceId ?? deviceId ?? null,
		});
	}),
);
