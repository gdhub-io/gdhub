import {
	createHandler,
	NotFoundException,
	Post,
	Req,
} from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { ensureMatrixUser, getMatrixUserToken } from "@/services/matrix-admin";
import { prisma } from "@/services/prisma";

@NextAuthGuard("user")
class MatrixProvisionHandler {
	@Post()
	async post(@Req() req: NextApiRequestWithUser) {
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

		if (user.matrixUserId) {
			const token = await getMatrixUserToken(req.user.id);

			return { userId: user.matrixUserId, token: token.accessToken };
		}

		const displayName = user.profile?.name || user.name || undefined;
		const avatarUrl = user.image || undefined;

		const existingMatrixUser = await ensureMatrixUser(
			user.id,
			user.email!,
			displayName,
			avatarUrl,
		);

		if (existingMatrixUser.user_id) {
			await prisma.user.update({
				where: { id: req.user?.id },
				data: {
					matrixUserId: existingMatrixUser.user_id,
				},
			});
		}

		const token = await getMatrixUserToken(req.user.id);

		return { userId: user.matrixUserId, token: token.accessToken };
	}
}

export default createHandler(MatrixProvisionHandler);
