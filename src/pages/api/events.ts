import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { IsBoolean, IsEnum, IsOptional } from 'class-validator'
import { Get, Query, ValidationPipe, createHandler } from 'next-api-decorators'

class GetEventsDto {
	@IsEnum(prismaClient.EventType, { each: true })
	@IsOptional()
	type?: prismaClient.EventType[]

	@IsBoolean()
	@IsOptional()
	withDates?: boolean

	@IsEnum(prismaClient.EventStatus, { each: true })
	@IsOptional()
	status?: prismaClient.EventStatus[]
}

@NextAuthGuard('user')
class ApiEventsEndpointHandler {
	@Get()
	public async get(@Query(ValidationPipe) { type, status, withDates = false }: GetEventsDto) {
		const events = await prisma.event.findMany({
			where: {
				type: type ? { in: type } : undefined,
				status: status ? { in: status } : prismaClient.$Enums.EventStatus.Published,
			},
			include: withDates
				? {
						schedule: { select: { startDate: true, endDate: true } },
					}
				: undefined,
		})

		return events
	}
}

export default createHandler(ApiEventsEndpointHandler)
