import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { IsString } from 'class-validator'
import { createHandler, Get, Query, Req, ValidationPipe } from 'next-api-decorators'

class UserProjectLinksDto {
	@IsString()
	id: string
}

@NextAuthGuard('user')
class ApiUserProjectLinksHandler {
	@Get()
	public async get(@Req() req: NextApiRequestWithUser, @Query(ValidationPipe) { id }: UserProjectLinksDto) {
		const data = await prisma.project.findUnique({
			where: { id },
			select: { id: true, links: true },
		})

		console.log('Database links data:', data?.links)
		return data?.links || []
	}
}

export default createHandler(ApiUserProjectLinksHandler)
