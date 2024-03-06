import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { IsString } from 'class-validator'
import { Get, Query, Req, ValidationPipe, createHandler } from 'next-api-decorators'

class GetProjectReportsDto {
	@IsString()
	slug: string
}

@NextAuthGuard('user')
class ApiUserProjectReportsHandler {
	@Get()
	public async get(@Req() req: NextApiRequestWithUser, @Query(ValidationPipe) { slug }: GetProjectReportsDto) {
		const reports = await prisma.projectReport.findMany({
			where: { project: { slug } },
			include: { project: true },
			orderBy: [{ publishedAt: 'desc' }],
		})

		return reports
	}
}

export default createHandler(ApiUserProjectReportsHandler)
