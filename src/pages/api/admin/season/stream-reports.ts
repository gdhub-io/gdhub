import { prisma } from '@/services/prisma'
import { IsString } from 'class-validator'
import { Get, Query, ValidationPipe, createHandler } from 'next-api-decorators'

class ParamsDto {
	@IsString()
	seasonId: string
}

class ApiSeasonStreamReportsHandler {
	constructor() {}

	@Get()
	public async list(@Query(ValidationPipe) { seasonId }: ParamsDto) {
		const streamReports = await prisma.seasonStreamReport.findMany({
			where: { stage: { seasonId: { equals: seasonId } } },
			include: { stage: { select: { id: true, name: true } } },
		})

		return streamReports
	}
}

export default createHandler(ApiSeasonStreamReportsHandler)
