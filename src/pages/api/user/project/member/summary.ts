import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { IsString, IsNotEmpty } from 'class-validator'
import dayjs from 'dayjs'
import { createHandler, Get, Query, Req } from 'next-api-decorators'

class TeamMemberSummaryQueryDto {
	@IsString()
	@IsNotEmpty()
	projectId: string
}

@NextAuthGuard('user')
class TeamMemberSummary {
	@Get()
	public async get(@Req() req: NextApiRequestWithUser, @Query() { projectId }: TeamMemberSummaryQueryDto) {
		const teamMember = await prisma.teamMember.findFirst({
			where: { userId: req.user.id, team: { project: { id: projectId } } },
			include: {
				user: { select: { profile: true } },
				team: true,
				equityAllocations: {
					include: {
						promises: {
							where: { isExecuted: false },
							include: { targetStep: true },
						},
					},
				},
			},
		})

		if (!teamMember) {
			throw new Error('Team member not found')
		}

		return {
			periodOnProject: teamMember.finishedAt
				? dayjs(teamMember.finishedAt).diff(dayjs(teamMember.startedAt), 'day')
				: dayjs().diff(dayjs(teamMember.startedAt), 'day'),
			availableHours: teamMember?.user.profile?.timeForWork || 0,
			promisedEquity: teamMember.equityAllocations.reduce(
				(acc: number, curr: { promises: { percentage: number }[] }) =>
					acc + curr.promises.reduce((acc: number, curr: { percentage: number }) => acc + curr.percentage, 0),
				0
			),
			actualEquity: teamMember.equityAllocations.reduce(
				(acc: number, curr: { percentage: number }) => acc + curr.percentage,
				0
			),
			workflowStepForVested: teamMember.equityAllocations[0]?.promises[0]?.targetStep?.name,
		}
	}
}

export default createHandler(TeamMemberSummary)
