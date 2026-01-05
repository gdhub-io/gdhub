import { randomUUID } from "node:crypto";
import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { Prisma } from "@prisma/client";
import { Transform, Type } from "class-transformer";
import {
	IsArray,
	IsBoolean,
	IsDate,
	IsDateString,
	IsEnum,
	IsObject,
	IsOptional,
	IsString,
	ValidateNested,
} from "class-validator";
import dayjs from "dayjs";
import {
	BadRequestException,
	Body,
	createHandler,
	Delete,
	ForbiddenException,
	Get,
	NotFoundException,
	Param,
	Post,
	Put,
	Req,
	ValidationPipe,
} from "next-api-decorators";
import slugify from "slugify";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { NovuService } from "@/services/novu";
import { prisma } from "@/services/prisma";

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

	@IsDateString()
	@IsOptional()
	startDate?: string;

	@IsDateString()
	@IsOptional()
	endDate?: string;

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

	@IsDate()
	startDate: Date;

	@IsDate()
	endDate: Date;

	@IsString()
	directionId: string;

	@IsEnum(prismaClient.$Enums.Language)
	lang: prismaClient.$Enums.Language;

	@IsEnum(prismaClient.$Enums.EventFormat)
	format: prismaClient.$Enums.EventFormat;

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

	@IsEnum(prismaClient.$Enums.Language)
	@IsOptional()
	lang?: prismaClient.$Enums.Language;

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
	content?: Record<string, any>;
}

class DuplicateEventDto {
	@IsEnum(prismaClient.$Enums.Language)
	lang: prismaClient.$Enums.Language;
}

class EventMembersMessageDto {
	@IsArray()
	@IsString({ each: true })
	memberIds: string[];

	@IsString()
	message: string;
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
					orderBy: [
						{
							startDate: "asc",
						},
					],
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
				description: "", //use content instead
				url: data.url,
				image: data.image,
				lang: data.lang,
				createdById: req.user.id,
				slug:
					data.slug ||
					slugify(data.title, { lower: true, strict: true }) +
						"-" +
						randomUUID().slice(-6),
			},
		});

		if (data.startDate && data.endDate) {
			await prisma.eventScheduleItem.create({
				data: {
					eventId: event.id,
					startDate: dayjs(data.startDate).toISOString(),
					endDate: dayjs(data.endDate).toISOString(),
					directionId: data.directionId,
					language: data.lang,
					format: data.format,
				},
			});
		}

		// for (const item of data.schedule ?? []) {
		// 	await prisma.eventScheduleItem.create({
		// 		data: {
		// 			eventId: event.id,
		// 			title: item.title,
		// 			description: item.description,
		// 			url: item.url,
		// 			directionId: item.directionId,
		// 			format: item.format,
		// 			language: item.language,
		// 			startDate: item.startDate?.toISOString() ?? new Date().toISOString(),
		// 			endDate: item.endDate?.toISOString() ?? new Date().toISOString(),
		// 			speakers:
		// 				item.speakers?.length > 0
		// 					? {
		// 							connect: item.speakers.map((speaker) => ({
		// 								id: speaker,
		// 							})),
		// 						}
		// 					: undefined,
		// 		},
		// 	});
		// }

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

	@Post("/:id/duplicate")
	public async duplicate(
		@Param("id") id: string,
		@Body(ValidationPipe) { lang }: DuplicateEventDto,
	) {
		const event = await prisma.event.findUnique({
			where: { id },
			include: {
				schedule: {
					include: {
						speakers: {
							select: {
								id: true,
							},
						},
					},
				},
			},
		});

		if (!event) {
			throw new NotFoundException("Event not found");
		}

		const {
			id: _,
			lang: _lang,
			schedule,
			createdAt: _createdAt,
			publishedAt: _publishedAt,
			updatedAt: _updatedAt,
			...data
		} = event;

		const duplicateEvent = await prisma.event.create({
			data: {
				...data,
				status: prismaClient.$Enums.EventStatus.Draft,
				publishedAt: null,
				content: data.content === null ? Prisma.JsonNull : data.content,
				parentId: event.id,
				lang,
			},
		});

		if (schedule && schedule.length > 0) {
			for (const item of schedule) {
				const {
					id: _id,
					eventId: _eventId,
					speakers: _speakers,
					...scheduleItemData
				} = item;

				await prisma.eventScheduleItem.create({
					data: {
						eventId: duplicateEvent.id,
						...scheduleItemData,
						speakers:
							item.speakers && item.speakers.length > 0
								? {
										connect: item.speakers.map((speaker) => ({
											id: speaker.id,
										})),
									}
								: undefined,
					},
				});
			}
		}

		return duplicateEvent;
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

	@Get("/:id/members")
	public async getMembers(
		@Req() req: NextApiRequestWithUser,
		@Param("id") id: string,
	) {
		const isAdmin = req.user.role === prismaClient.UserRole.Admin;

		const event = await prisma.event.findUnique({
			where: { id },
			select: { createdById: true },
		});

		if (!event) {
			throw new NotFoundException("Event not found");
		}

		if (!isAdmin && event.createdById !== req.user.id) {
			throw new ForbiddenException("You are not allowed to view members");
		}

		const members = await prisma.eventMember.findMany({
			where: { eventId: id },
			include: {
				user: {
					select: {
						id: true,
						name: true,
						email: true,
						image: true,
						profile: { select: { name: true } },
					},
				},
			},
			orderBy: { createdAt: "asc" },
		});

		return members;
	}

	@Post("/:id/register")
	public async register(
		@Req() req: NextApiRequestWithUser,
		@Param("id") id: string,
	) {
		const event = await prisma.event.findUnique({
			where: { id },
			include: {
				createdBy: {
					select: {
						id: true,
						email: true,
						name: true,
					},
				},
			},
		});

		if (!event) {
			throw new NotFoundException("Event not found");
		}

		if (event.status !== prismaClient.$Enums.EventStatus.Published) {
			throw new BadRequestException("Event is not open for registration");
		}

		const existingMember = await prisma.eventMember.findFirst({
			where: {
				eventId: id,
				userId: req.user.id as string,
				status: {
					in: [
						prismaClient.$Enums.EventMemberStatus.Pending,
						prismaClient.$Enums.EventMemberStatus.Approved,
					],
				},
			},
		});

		if (existingMember) {
			return { success: true, alreadyRegistered: true };
		}

		const member = await prisma.eventMember.create({
			data: {
				eventId: id,
				userId: req.user.id as string,
				status: prismaClient.$Enums.EventMemberStatus.Approved,
			},
		});

		// Notify participant
		try {
			if (req.user.id) {
				await NovuService.send({
					to: {
						subscriberId: req.user.id as string,
						email: req.user.email,
					},
					template: "event-member-registered",
					payload: {
						eventLink: `${process.env.NEXT_PUBLIC_APP_URL}/event/${event.slug}`,
						eventTitle: event.title,
						memberId: req.user.id,
						memberName: req.user.name,
					},
				});
			}
		} catch (error) {
			console.error("Failed to send Novu notification to member", error);
		}

		// Notify event creator
		try {
			if (event.createdById) {
				await NovuService.send({
					to: {
						subscriberId: event.createdById,
						email: event.createdBy.email ?? undefined,
					},
					template: "event-owner-new-member",
					payload: {
						eventId: event.id,
						eventTitle: event.title,
						memberId: req.user.id,
						memberName: req.user.name,
					},
				});
			}
		} catch (error) {
			console.error("Failed to send Novu notification to event owner", error);
		}

		return { success: true, member };
	}

	@Post("/:id/members/message")
	public async sendMessageToMembers(
		@Req() req: NextApiRequestWithUser,
		@Param("id") id: string,
		@Body(ValidationPipe) body: EventMembersMessageDto,
	) {
		const isAdmin = req.user.role === prismaClient.UserRole.Admin;

		const event = await prisma.event.findUnique({
			where: { id },
			include: {
				createdBy: {
					select: {
						id: true,
						email: true,
						name: true,
					},
				},
			},
		});

		if (!event) {
			throw new NotFoundException("Event not found");
		}

		if (!isAdmin && event.createdById !== req.user.id) {
			throw new ForbiddenException("You are not allowed to send messages");
		}

		const members = await prisma.eventMember.findMany({
			where: {
				eventId: id,
				id: { in: body.memberIds },
			},
			include: {
				user: {
					select: {
						id: true,
						email: true,
						name: true,
					},
				},
			},
		});

		await Promise.all(
			members.map((member) =>
				NovuService.send({
					to: {
						subscriberId: member.user.id,
						email: member.user.email ?? undefined,
					},
					template: "event-member-message",
					payload: {
						eventId: event.id,
						eventTitle: event.title,
						eventUrl: `${process.env.NEXT_PUBLIC_APP_URL}/event/${event.slug}`,
						message: body.message,
						memberId: member.user.id,
						memberName: member.user.name,
						senderId: req.user.id,
						senderName: req.user.name,
					},
				}),
			),
		);

		return { success: true, sent: members.length };
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
		if (!data.startDate || !data.endDate) {
			throw new BadRequestException("Start and end date are required");
		}

		await prisma.eventScheduleItem.create({
			data: {
				eventId: id,
				title: data.title,
				description: data.description,
				url: data.url,
				directionId: data.directionId,
				format: data.format,
				language: data.language,
				startDate: data.startDate,
				endDate: data.endDate,
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
				startDate: data.startDate,
				endDate: data.endDate,
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
