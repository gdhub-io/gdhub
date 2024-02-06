import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { IsString } from 'class-validator'
import { Get, Query, Req, ValidationPipe, createHandler } from 'next-api-decorators'

class GetProjectReportsDto {
	@IsString()
	projectId: string
}

@NextAuthGuard('user')
class ApiUserProjectReportsHandler {
	@Get()
	public async get(@Req() req: NextApiRequestWithUser, @Query(ValidationPipe) { projectId }: GetProjectReportsDto) {
		const reports = await prisma.projectReport.findMany({
			where: { projectId },
			orderBy: [{ publishedAt: 'desc' }],
		})

		return reports
	}
}

export default createHandler(ApiUserProjectReportsHandler)
