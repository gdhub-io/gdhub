import { IsOptional, IsString } from "class-validator";
import {
	Body,
	createHandler,
	NotFoundException,
	Post,
	Req,
} from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { ensureMatrixUser, getMatrixUserToken } from "@/services/matrix-admin";
import { prisma } from "@/services/prisma";

class MatrixSessionRequestBody {
	@IsOptional()
	@IsString()
	deviceId?: string;
}

@NextAuthGuard("user")
class MatrixProvisionHandler {
	@Post()
	async post(
		@Req() req: NextApiRequestWithUser,
		@Body() body: MatrixSessionRequestBody,
	) {
		const user = await prisma.user.findUnique({
			where: {
				id: req.user?.id,
			},
			include: {
				profile: true,
			},
		});

		if (!user) {
			throw new NotFoundException("User not found");
		}

		if (!user.email) {
			throw new NotFoundException("User email is not set");
		}

		let matrixUserId = user.matrixUserId;

		if (!matrixUserId) {
			const displayName = user.profile?.name || user.name || undefined;
			const avatarUrl = user.image || undefined;

			const existingMatrixUser = await ensureMatrixUser(
				user.id,
				user.email,
				displayName,
				avatarUrl,
			);

			if (existingMatrixUser.user_id) {
				matrixUserId = existingMatrixUser.user_id;
				await prisma.user.update({
					where: { id: req.user?.id },
					data: {
						matrixUserId: existingMatrixUser.user_id,
					},
				});
			}
		}

		if (!matrixUserId) {
			throw new NotFoundException("Matrix user could not be provisioned");
		}

		const token = await getMatrixUserToken(req.user.id, body.deviceId);

		return {
			userId: matrixUserId,
			token: token.accessToken,
			deviceId: token.deviceId ?? body.deviceId ?? null,
		};
	}
}

export default createHandler(MatrixProvisionHandler);
