import { prisma } from '@/services/prisma'
import { IsString } from 'class-validator'
import { Get, Query, ValidationPipe, createHandler } from 'next-api-decorators'

class ParamsDto {
	@IsString()
	stageId: string
}

class ApiSeasonStreamReportsHandler {
	constructor() {}

	@Get()
	public async list(@Query(ValidationPipe) { stageId }: ParamsDto) {
		const streamReports = await prisma.seasonStreamReport.findMany({ where: { stageId } })

		return streamReports
	}
}

export default createHandler(ApiSeasonStreamReportsHandler)
