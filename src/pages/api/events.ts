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
		{
			type,
			status,
			timeStatus = [EventTimeStatus.Upcoming, EventTimeStatus.Ongoing, EventTimeStatus.Past],
			withDates = false,
		}: GetEventsDto
	) {
		const timeWhere: prismaClient.Prisma.EventScheduleItemWhereInput = {
			OR: [],
		}

		if (timeStatus?.includes(EventTimeStatus.Ongoing)) {
			timeWhere.OR?.push({
				startDate: {
					lte: new Date(),
				},
				endDate: {
					gte: new Date(),
				},
			})
		}

		if (timeStatus?.includes(EventTimeStatus.Past)) {
			timeWhere.OR?.push({
				endDate: {
					lt: new Date(),
				},
			})
		}

		if (timeStatus?.includes(EventTimeStatus.Upcoming)) {
			timeWhere.OR?.push({
				startDate: {
					gte: new Date(),
				},
			})
		}

		const events = await prisma.event.findMany({
			where: {
				type: type ? { in: type } : undefined,
				status: status
					? { in: status }
					: { notIn: [prismaClient.$Enums.EventStatus.Closed, prismaClient.$Enums.EventStatus.Draft] },
				schedule: !!timeWhere.OR?.length
					? {
							some: timeWhere,
						}
					: undefined,
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
