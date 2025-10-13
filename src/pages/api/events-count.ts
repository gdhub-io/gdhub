import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { Transform } from "class-transformer";
import { IsArray, IsBoolean, IsEnum, IsOptional } from "class-validator";
import { createHandler, Get, Query, ValidationPipe } from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { prisma } from "@/services/prisma";

enum EventTimeStatus {
	Upcoming = "upcoming",
	Ongoing = "ongoing",
	Past = "past",
}

class GetEventsDto {
	@IsEnum(prismaClient.EventType, { each: true })
	@IsOptional()
	type?: prismaClient.EventType[];

	@IsBoolean()
	@IsOptional()
	withDates?: boolean;

	@IsEnum(prismaClient.EventStatus, { each: true })
	@IsOptional()
	status?: prismaClient.EventStatus[];

	@IsArray()
	@IsEnum(EventTimeStatus, { each: true })
	@IsOptional()
	@Transform(({ value }) => (Array.isArray(value) ? value : [value]))
	timeStatus?: EventTimeStatus[];
}

@NextAuthGuard("user")
class ApiEventsEndpointHandler {
	@Get()
	public async get(
		@Query(ValidationPipe)
		{
			type,
			status,
			timeStatus = [
				EventTimeStatus.Upcoming,
				EventTimeStatus.Ongoing,
				EventTimeStatus.Past,
			],
		}: GetEventsDto,
	) {
		const timeWhere: prismaClient.Prisma.EventScheduleItemWhereInput = {
			startDate: {
				lt: new Date(),
			},
		};

		if (timeStatus?.includes(EventTimeStatus.Ongoing)) {
			timeWhere.startDate = {
				lte: new Date(),
			};
			timeWhere.endDate = {
				gte: new Date(),
			};
		}

		if (timeStatus?.includes(EventTimeStatus.Past)) {
			timeWhere.endDate = {
				lt: new Date(),
			};
		}

		if (timeStatus?.includes(EventTimeStatus.Upcoming)) {
			timeWhere.startDate = {
				gte: new Date(),
			};
		}

		if (
			timeStatus?.includes(EventTimeStatus.Upcoming) &&
			timeStatus?.includes(EventTimeStatus.Ongoing)
		) {
			timeWhere.OR = [
				{
					OR: [
						{ startDate: { gte: new Date() } },
						{ startDate: { lt: new Date() }, endDate: { gte: new Date() } },
					],
				},
			];
		}

		const eventCount = await prisma.event.count({
			where: {
				status: status
					? { in: status }
					: {
							in: [
								prismaClient.$Enums.EventStatus.Published,
								prismaClient.$Enums.EventStatus.Archived,
							],
						},
			},
		});

		return { count: eventCount };
	}
}

export default createHandler(ApiEventsEndpointHandler);
