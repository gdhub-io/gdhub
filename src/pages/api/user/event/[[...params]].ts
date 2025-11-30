import { randomUUID } from "node:crypto";
import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { Transform, Type } from "class-transformer";
import {
	IsArray,
	IsBoolean,
	IsDate,
	IsEnum,
	IsObject,
	IsOptional,
	IsString,
	ValidateNested,
} from "class-validator";
import {
	Body,
	createHandler,
	Delete,
	Get,
	NotFoundException,
	Param,
	Post,
	Put,
	Query,
	Req,
	ValidationPipe,
} from "next-api-decorators";
import slugify from "slugify";
import { AvailableLocales } from "@/config/locale";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { prisma } from "@/services/prisma";

class IDParamDto {
	@IsString()
	id: string;
}

class UserEventScheduleItemDto {
	@IsString()
	@IsOptional()
	id?: string;

	@IsString()
	@IsOptional()
	title?: string;

	@IsString()
	@IsOptional()
	description?: string;

	@IsString()
	@IsOptional()
	url?: string;

	@IsDate()
	@IsOptional()
	startDate?: Date;

	@IsDate()
	@IsOptional()
	endDate?: Date;

	@IsArray()
	@IsString({ each: true })
	@Transform(({ value }) =>
		Array.isArray(value)
			? value.map((v) => (typeof v === "string" ? v : v?.id))
			: value,
	)
	speakers: string[];

	@IsString()
	directionId: string;

	@IsString()
	@IsOptional()
	format: prismaClient.$Enums.EventFormat;

	@IsString()
	@IsOptional()
	language: prismaClient.$Enums.Language;
}

class UserEventCreateDto {
	@IsString()
	title: string;

	@IsString()
	@IsOptional()
	slug?: string;

	@IsString()
	@IsOptional()
	shortDescription?: string;

	@IsString()
	description: string;

	@IsString()
	@IsOptional()
	url?: string;

	@IsString()
	@IsOptional()
	image?: string;

	@IsString()
	@IsEnum(prismaClient.EventType)
	type: prismaClient.EventType;

	@IsBoolean()
	@IsOptional()
	isFree?: boolean;

	@IsArray()
	@ValidateNested({ each: true })
	@IsOptional()
	@Type(() => UserEventScheduleItemDto)
	schedule?: UserEventScheduleItemDto[];
}

class UserEventUpdateDto {
	@IsString()
	@IsOptional()
	title?: string;

	@IsString()
	@IsOptional()
	slug?: string;

	@IsString()
	@IsOptional()
	description?: string;

	@IsString()
	@IsOptional()
	shortDescription?: string;

	@IsString()
	@IsOptional()
	url?: string;

	@IsString()
	@IsOptional()
	image?: string;

	@IsBoolean()
	@IsOptional()
	isFree?: boolean;

	@IsObject()
	@IsOptional()
	content?: any;
}

@NextAuthGuard("user")
class ApiUserEventEndpointHandler {
	@Get("/count")
	public async count(@Req() req: NextApiRequestWithUser) {
		const userCount = await prisma.event.count({
			where: {
				createdById: req.user.id,
			},
		});

		const totalPublishedCount = await prisma.event.count({
			where: {
				status: {
					in: [
						prismaClient.$Enums.EventStatus.Published,
						prismaClient.$Enums.EventStatus.Archived,
					],
				},
			},
		});

		return { userCount, totalPublishedCount };
	}

	@Get("/:id")
	public async get(
		@Req() req: NextApiRequestWithUser,
		@Param("id") id: string,
	) {
		const isAdmin = req.user.role === prismaClient.UserRole.Admin;

		return await prisma.event.findUnique({
			where: {
				id,
				createdById: isAdmin ? undefined : req.user.id,
			},
			include: {
				schedule: {
					include: {
						speakers: {
							select: {
								id: true,
								name: true,
								user: {
									select: {
										image: true,
										profile: {
											select: {
												name: true,
											},
										},
									},
								},
							},
						},
					},
				},
			},
		});
	}

	@Post()
	public async create(
		@Req() req: NextApiRequestWithUser,
		@Body(ValidationPipe) data: UserEventCreateDto,
	) {
		const event = await prisma.event.create({
			data: {
				type: data.type,
				title: data.title,
				shortDescription: data.shortDescription,
				description: data.description,
				url: data.url,
				image: data.image,
				createdById: req.user.id,
				slug:
					data.slug ||
					slugify(data.title, { lower: true, strict: true }) +
						"-" +
						randomUUID().slice(-6),
			},
		});

		for (const item of data.schedule ?? []) {
			await prisma.eventScheduleItem.create({
				data: {
					eventId: event.id,
					title: item.title,
					description: item.description,
					url: item.url,
					directionId: item.directionId,
					format: item.format,
					language: item.language,
					startDate: item.startDate?.toISOString() ?? new Date().toISOString(),
					endDate: item.endDate?.toISOString() ?? new Date().toISOString(),
					speakers:
						item.speakers?.length > 0
							? {
									connect: item.speakers.map((speaker) => ({
										id: speaker,
									})),
								}
							: undefined,
				},
			});
		}

		return event;
	}

	@Put("/:id")
	public async update(
		@Param("id") id: string,
		@Body(ValidationPipe) data: UserEventUpdateDto,
	) {
		const event = await prisma.event.update({
			where: {
				id,
			},
			data: data,
			include: {
				schedule: true,
			},
		});

		return event;
	}

	@Put("/:id/publish")
	public async publish(@Param("id") id: string) {
		await prisma.event.update({
			where: { id },
			data: {
				status: prismaClient.$Enums.EventStatus.Published,
				publishedAt: new Date().toISOString(),
			},
		});
	}

	@Put("/:id/unpublish")
	public async unpublish(@Param("id") id: string) {
		await prisma.event.update({
			where: { id },
			data: {
				status: prismaClient.$Enums.EventStatus.Draft,
				publishedAt: null,
			},
		});
	}

	@Put("/:id/archive")
	public async archive(@Param("id") id: string) {
		await prisma.event.update({
			where: { id },
			data: { status: prismaClient.$Enums.EventStatus.Archived },
		});
	}

	@Put("/:id/restore")
	public async restore(@Param("id") id: string) {
		await prisma.event.update({
			where: { id },
			data: {
				status: prismaClient.$Enums.EventStatus.Draft,
				publishedAt: null,
			},
		});
	}

	@Put("/:id/generate-slug")
	public async generateSlug(@Param("id") id: string) {
		const event = await prisma.event.findUnique({
			where: { id },
			select: { title: true },
		});

		if (!event) {
			throw new NotFoundException("Event not found");
		}

		const updatedEvent = await prisma.event.update({
			where: { id },
			data: {
				slug:
					slugify(event.title, { lower: true, strict: true }) +
					"-" +
					randomUUID().slice(-6),
			},
		});

		return { slug: updatedEvent.slug };
	}

	@Delete("/:id")
	public async delete(@Param("id") id: string) {
		await prisma.event.delete({
			where: {
				id,
			},
		});

		return { success: true };
	}

	@Post("/:id/schedule")
	public async createScheduleItem(
		@Param("id") id: string,
		@Body(ValidationPipe) data: UserEventScheduleItemDto,
	) {
		await prisma.eventScheduleItem.create({
			data: {
				eventId: id,
				title: data.title,
				description: data.description,
				url: data.url,
				directionId: data.directionId,
				format: data.format,
				language: data.language,
				startDate: data.startDate?.toISOString() ?? new Date().toISOString(),
				endDate: data.endDate?.toISOString() ?? new Date().toISOString(),
				speakers: data.speakers?.length
					? {
							connect: data.speakers.map((speaker) => ({
								id: speaker,
							})),
						}
					: undefined,
			},
		});
	}

	@Put("/:id/schedule/:scheduleItemId")
	public async updateScheduleItem(
		@Param("id") id: string,
		@Param("scheduleItemId") scheduleItemId: string,
		@Body(ValidationPipe) data: UserEventScheduleItemDto,
	) {
		await prisma.eventScheduleItem.update({
			where: {
				id: scheduleItemId,
				eventId: id,
			},
			data: {
				title: data.title,
				description: data.description,
				url: data.url,
				directionId: data.directionId,
				format: data.format,
				language: data.language,
				startDate: data.startDate?.toISOString() ?? new Date().toISOString(),
				endDate: data.endDate?.toISOString() ?? new Date().toISOString(),
				speakers: data.speakers?.length
					? {
							set: data.speakers.map((speakerId) => ({
								id: speakerId,
							})),
						}
					: { set: [] },
			},
		});

		return { success: true };
	}

	@Delete("/:id/schedule/:scheduleItemId")
	public async deleteScheduleItem(
		@Param("id") id: string,
		@Param("scheduleItemId") scheduleItemId: string,
	) {
		await prisma.eventScheduleItem.delete({
			where: {
				id: scheduleItemId,
				eventId: id,
			},
		});

		return { success: true };
	}
}

export default createHandler(ApiUserEventEndpointHandler);
