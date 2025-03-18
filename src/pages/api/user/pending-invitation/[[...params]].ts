import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { Get, Param, Req, createHandler } from 'next-api-decorators'

@NextAuthGuard('user')
class ApiUserPendingInvitationHandler {
	constructor() {}

	@Get('/:teamInvitationId')
	public async pendingInvitation(
		@Req() req: NextApiRequestWithUser,
		@Param('teamInvitationId') teamInvitationId: string
	) {
		const user = await prisma.user.findUnique({
			where: { id: req.user.id },
		})

		const pendingInvitation = user?.pendingTeamInvitations.find((r: any) => r.invitationId == teamInvitationId)

		console.log(pendingInvitation)

		return pendingInvitation
	}
}

export default createHandler(ApiUserPendingInvitationHandler)
