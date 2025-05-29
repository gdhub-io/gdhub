import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { Transform } from 'class-transformer'
import { IsArray, IsBoolean, IsEnum, IsOptional } from 'class-validator'
import { Get, Query, ValidationPipe, createHandler } from 'next-api-decorators'

enum EventTimeStatus {
	Upcoming = 'upcoming',
	Ongoing = 'ongoing',
	Past = 'past',
}

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

	@IsArray()
	@IsEnum(EventTimeStatus, { each: true })
	@IsOptional()
	@Transform(({ value }) => (Array.isArray(value) ? value : [value]))
	timeStatus?: EventTimeStatus[]
}

@NextAuthGuard('user')
class ApiEventsEndpointHandler {
	@Get()
	public async get(
		@Query(ValidationPipe)
		{ type, status, timeStatus = [EventTimeStatus.Upcoming, EventTimeStatus.Ongoing], withDates = false }: GetEventsDto
	) {
		const timeWhere: prismaClient.Prisma.EventScheduleItemWhereInput = {
			startDate: {
				lt: new Date(),
			},
		}

		if (timeStatus?.includes(EventTimeStatus.Ongoing)) {
			timeWhere.startDate = {
				lte: new Date(),
			}
			timeWhere.endDate = {
				gte: new Date(),
			}
		}

		if (timeStatus?.includes(EventTimeStatus.Past)) {
			timeWhere.endDate = {
				lt: new Date(),
			}
		}

		if (timeStatus?.includes(EventTimeStatus.Upcoming)) {
			timeWhere.startDate = {
				gte: new Date(),
			}
		}

		if (timeStatus?.includes(EventTimeStatus.Upcoming) && timeStatus?.includes(EventTimeStatus.Ongoing)) {
			timeWhere.OR = [
				{
					OR: [{ startDate: { gte: new Date() } }, { startDate: { lt: new Date() }, endDate: { gte: new Date() } }],
				},
			]
		}

		const events = await prisma.event.findMany({
			where: {
				type: type ? { in: type } : undefined,
				status: status ? { in: status } : prismaClient.$Enums.EventStatus.Published,
				schedule: {
					some: timeWhere,
				},
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
