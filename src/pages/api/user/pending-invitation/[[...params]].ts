import { createHandler, Get, Param, Req } from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { prisma } from "@/services/prisma";

@NextAuthGuard("user")
class ApiUserPendingInvitationHandler {
	constructor() {}

	@Get("/:teamInvitationId")
	public async pendingInvitation(
		@Req() req: NextApiRequestWithUser,
		@Param("teamInvitationId") teamInvitationId: string,
	) {
		const user = await prisma.user.findUnique({
			where: { id: req.user.id },
		});

		const pendingInvitation = user?.pendingTeamInvitations.find(
			(r: any) => r.invitationId == teamInvitationId,
		);

		console.log(pendingInvitation);

		return pendingInvitation;
	}
}

export default createHandler(ApiUserPendingInvitationHandler);
