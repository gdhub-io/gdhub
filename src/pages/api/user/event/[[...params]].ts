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
import type { NextApiResponse } from "next";
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
	Query,
	Req,
	Res,
	ValidationPipe,
} from "next-api-decorators";
import slugify from "slugify";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { LegalService } from "@/services/legal";
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

	@IsBoolean()
	@IsOptional()
	certificationEnabled?: boolean;
}

class CertificationConfigDto {
	@IsString()
	@IsOptional()
	organizerName?: string | null;

	@IsString()
	@IsOptional()
	organizerTitle?: string | null;
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

class EventMemberUpdateDto {
	@IsString()
	@IsOptional()
	projectId?: string | null;

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	mentorIds?: string[];
}

class EventMembersBatchUpdateDto {
	@IsArray()
	@IsString({ each: true })
	memberIds: string[];

	@IsString()
	@IsOptional()
	projectId?: string | null;

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	mentorIds?: string[];
}

class EventMembersCommonProjectsDto {
	@IsArray()
	@IsString({ each: true })
	@Transform(({ value }) => (Array.isArray(value) ? value : [value]))
	memberIds: string[];
}

async function resolveEventCertificationContext(eventId: string) {
	const event = await prisma.event.findUnique({
		where: { id: eventId },
		select: {
			id: true,
			title: true,
			type: true,
			createdById: true,
			certificationOrganizerName: true,
			certificationOrganizerTitle: true,
			createdBy: {
				select: {
					name: true,
					profile: { select: { name: true } },
					specialities: {
						orderBy: { createdAt: "asc" },
						take: 1,
						select: { name: true },
					},
				},
			},
			schedule: {
				select: { startDate: true, endDate: true },
			},
		},
	});

	if (!event) return null;

	const defaultOrganizerName =
		event.createdBy.profile?.name?.trim() || event.createdBy.name?.trim() || "";
	const defaultOrganizerTitle =
		event.createdBy.specialities[0]?.name?.trim() || "";

	const startTimes = event.schedule
		.map((s) => s.startDate.getTime())
		.filter((t) => Number.isFinite(t));
	const endTimes = event.schedule
		.map((s) => s.endDate.getTime())
		.filter((t) => Number.isFinite(t));
	const startDate = startTimes.length
		? new Date(Math.min(...startTimes))
		: null;
	const endDate = endTimes.length ? new Date(Math.max(...endTimes)) : null;

	return {
		id: event.id,
		title: event.title,
		type: event.type,
		createdById: event.createdById,
		startDate,
		endDate,
		storedOrganizerName: event.certificationOrganizerName,
		storedOrganizerTitle: event.certificationOrganizerTitle,
		defaultOrganizerName,
		defaultOrganizerTitle,
		effectiveOrganizerName:
			event.certificationOrganizerName?.trim() || defaultOrganizerName,
		effectiveOrganizerTitle:
			event.certificationOrganizerTitle?.trim() || defaultOrganizerTitle,
	};
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

	@Post("/:id/certification/template")
	public async createCertificationTemplate(
		@Req() req: NextApiRequestWithUser,
		@Param("id") id: string,
	) {
		const isAdmin = req.user.role === prismaClient.UserRole.Admin;

		const ctx = await resolveEventCertificationContext(id);

		if (!ctx) {
			throw new NotFoundException("Event not found");
		}

		if (!isAdmin && ctx.createdById !== req.user.id) {
			throw new ForbiddenException(
				"You are not allowed to manage certification for this event",
			);
		}

		const legalService = new LegalService();
		const document = await legalService.createEventCertificateDocument({
			eventId: ctx.id,
			eventTitle: ctx.title,
			eventType: ctx.type,
			organizerName: ctx.effectiveOrganizerName,
			organizerTitle: ctx.effectiveOrganizerTitle,
			startDate: ctx.startDate,
			endDate: ctx.endDate,
		});

		await prisma.event.update({
			where: { id },
			data: {
				certificationTemplateId: String(document.documentId),
			},
		});

		return {
			id: document.documentId,
			title: document.title,
		};
	}

	@Get("/:id/certification/template")
	public async getCertificationTemplate(
		@Req() req: NextApiRequestWithUser,
		@Param("id") id: string,
	) {
		const isAdmin = req.user.role === prismaClient.UserRole.Admin;

		const event = await prisma.event.findUnique({
			where: { id },
			select: {
				createdById: true,
				certificationTemplateId: true,
			},
		});

		if (!event) {
			throw new NotFoundException("Event not found");
		}

		if (!isAdmin && event.createdById !== req.user.id) {
			throw new ForbiddenException(
				"You are not allowed to view certification for this event",
			);
		}

		if (!event.certificationTemplateId) {
			return null;
		}

		const documentId = Number(event.certificationTemplateId);
		if (!Number.isFinite(documentId)) {
			return null;
		}

		try {
			const legalService = new LegalService();
			const document = await legalService.getDocument(documentId);
			return {
				id: document.id,
				title: document.title,
				status: document.status,
			};
		} catch (error) {
			console.error("Failed to fetch certification document", error);
			return null;
		}
	}

	@Get("/:id/certification/config")
	public async getCertificationConfig(
		@Req() req: NextApiRequestWithUser,
		@Param("id") id: string,
	) {
		const isAdmin = req.user.role === prismaClient.UserRole.Admin;

		const ctx = await resolveEventCertificationContext(id);

		if (!ctx) {
			throw new NotFoundException("Event not found");
		}

		if (!isAdmin && ctx.createdById !== req.user.id) {
			throw new ForbiddenException(
				"You are not allowed to view certification for this event",
			);
		}

		return {
			organizerName: ctx.storedOrganizerName,
			organizerTitle: ctx.storedOrganizerTitle,
			defaults: {
				organizerName: ctx.defaultOrganizerName,
				organizerTitle: ctx.defaultOrganizerTitle,
			},
		};
	}

	@Put("/:id/certification/config")
	public async updateCertificationConfig(
		@Req() req: NextApiRequestWithUser,
		@Param("id") id: string,
		@Body(ValidationPipe) body: CertificationConfigDto,
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
			throw new ForbiddenException(
				"You are not allowed to manage certification for this event",
			);
		}

		const normalize = (v: string | null | undefined) => {
			if (v === undefined) return undefined;
			if (v === null) return null;
			const trimmed = v.trim();
			return trimmed === "" ? null : trimmed;
		};

		await prisma.event.update({
			where: { id },
			data: {
				certificationOrganizerName: normalize(body.organizerName),
				certificationOrganizerTitle: normalize(body.organizerTitle),
			},
		});

		return { ok: true };
	}

	@Get("/:id/certification/template/pdf")
	public async getCertificationTemplatePdf(
		@Req() req: NextApiRequestWithUser,
		@Res() res: NextApiResponse,
		@Param("id") id: string,
	) {
		const isAdmin = req.user.role === prismaClient.UserRole.Admin;

		const ctx = await resolveEventCertificationContext(id);

		if (!ctx) {
			throw new NotFoundException("Event not found");
		}

		if (!isAdmin && ctx.createdById !== req.user.id) {
			throw new ForbiddenException(
				"You are not allowed to view certification for this event",
			);
		}

		const legalService = new LegalService();
		const pdfBytes = await legalService.generateEventCertificatePdf({
			eventType: ctx.type,
			organizerName: ctx.effectiveOrganizerName,
			organizerTitle: ctx.effectiveOrganizerTitle,
			startDate: ctx.startDate,
			endDate: ctx.endDate,
		});

		res.setHeader("Content-Type", "application/pdf");
		res.setHeader(
			"Content-Disposition",
			'inline; filename="certificate-preview.pdf"',
		);
		res.setHeader("Cache-Control", "no-store");
		res.send(Buffer.from(pdfBytes));
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
				teamMember: {
					select: {
						id: true,
						position: true,
						startedAt: true,
						finishedAt: true,
						team: {
							select: {
								projectId: true,
								project: { select: { id: true, name: true, slug: true } },
							},
						},
					},
				},
				mentors: {
					select: {
						id: true,
						name: true,
						user: {
							select: {
								id: true,
								name: true,
								image: true,
								profile: { select: { name: true } },
							},
						},
						direction: { select: { id: true, name: true } },
					},
				},
			},
			orderBy: { createdAt: "asc" },
		});

		return members;
	}

	@Get("/:id/members/common-projects")
	public async getMembersCommonProjects(
		@Req() req: NextApiRequestWithUser,
		@Param("id") id: string,
		@Query(ValidationPipe) { memberIds }: EventMembersCommonProjectsDto,
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

		if (!memberIds.length) return [];

		const members = await prisma.eventMember.findMany({
			where: { eventId: id, id: { in: memberIds } },
			select: { userId: true },
		});

		if (members.length !== memberIds.length) {
			throw new BadRequestException("Some members do not belong to this event");
		}

		const userIds = members.map((m) => m.userId);

		const teamMembers = await prisma.teamMember.findMany({
			where: { userId: { in: userIds } },
			select: {
				userId: true,
				position: true,
				startedAt: true,
				finishedAt: true,
				team: {
					select: {
						projectId: true,
						project: { select: { id: true, name: true, slug: true } },
					},
				},
			},
		});

		const userProjectsMap = new Map<string, Set<string>>();
		const projectById = new Map<
			string,
			{ id: string; name: string; slug: string }
		>();

		for (const tm of teamMembers) {
			const projectId = tm.team?.projectId;
			const project = tm.team?.project;
			if (!projectId || !project) continue;

			projectById.set(projectId, project);

			if (!userProjectsMap.has(tm.userId)) {
				userProjectsMap.set(tm.userId, new Set());
			}
			userProjectsMap.get(tm.userId)?.add(projectId);
		}

		if (userProjectsMap.size !== userIds.length) {
			return [];
		}

		const userProjectSets = Array.from(userProjectsMap.values());
		const [first, ...rest] = userProjectSets;
		const intersection = new Set<string>();
		for (const projectId of first) {
			if (rest.every((set) => set.has(projectId))) {
				intersection.add(projectId);
			}
		}

		return Array.from(intersection)
			.map((projectId) => projectById.get(projectId))
			.filter(Boolean);
	}

	@Get("/:id/members/:memberId/projects")
	public async getMemberProjects(
		@Req() req: NextApiRequestWithUser,
		@Param("id") id: string,
		@Param("memberId") memberId: string,
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

		const member = await prisma.eventMember.findFirst({
			where: { id: memberId, eventId: id },
			select: { userId: true },
		});

		if (!member) {
			throw new NotFoundException("Member not found");
		}

		const teamMembers = await prisma.teamMember.findMany({
			where: { userId: member.userId },
			select: {
				position: true,
				startedAt: true,
				finishedAt: true,
				team: {
					select: {
						projectId: true,
						project: { select: { id: true, name: true, slug: true } },
					},
				},
			},
			orderBy: { startedAt: "desc" },
		});

		return teamMembers
			.map((tm) => {
				const project = tm.team?.project;
				if (!project) return null;
				return {
					id: project.id,
					name: project.name,
					slug: project.slug,
					position: tm.position,
					startedAt: tm.startedAt,
					finishedAt: tm.finishedAt,
				};
			})
			.filter(Boolean);
	}

	@Put("/:id/members/:memberId")
	public async updateMember(
		@Req() req: NextApiRequestWithUser,
		@Param("id") id: string,
		@Param("memberId") memberId: string,
		@Body(ValidationPipe) body: EventMemberUpdateDto,
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
			throw new ForbiddenException("You are not allowed to edit members");
		}

		const member = await prisma.eventMember.findFirst({
			where: { id: memberId, eventId: id },
			select: { id: true, userId: true },
		});

		if (!member) {
			throw new NotFoundException("Member not found");
		}

		let teamMemberId: string | null = null;
		if (body.projectId) {
			const teamMembership = await prisma.teamMember.findFirst({
				where: {
					userId: member.userId,
					team: { projectId: body.projectId },
				},
				select: { id: true },
			});

			if (!teamMembership) {
				throw new BadRequestException(
					"This user is not a team member of the selected project",
				);
			}
			teamMemberId = teamMembership.id;
		}

		if (body.mentorIds?.length) {
			const found = await prisma.speciality.findMany({
				where: { id: { in: body.mentorIds } },
				select: { id: true },
			});
			if (found.length !== body.mentorIds.length) {
				throw new BadRequestException(
					"Some mentor specialities were not found",
				);
			}
		}

		await prisma.eventMember.update({
			where: { id: memberId },
			data: {
				teamMemberId: body.projectId !== undefined ? teamMemberId : undefined,
				...(body.mentorIds !== undefined
					? {
							mentors: {
								set: body.mentorIds.map((id) => ({ id })),
							},
						}
					: {}),
			},
		});

		return { success: true };
	}

	@Post("/:id/members/batch")
	public async batchUpdateMembers(
		@Req() req: NextApiRequestWithUser,
		@Param("id") id: string,
		@Body(ValidationPipe) body: EventMembersBatchUpdateDto,
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
			throw new ForbiddenException("You are not allowed to edit members");
		}

		const members = await prisma.eventMember.findMany({
			where: { id: { in: body.memberIds }, eventId: id },
			select: { id: true, userId: true },
		});

		if (members.length !== body.memberIds.length) {
			throw new BadRequestException("Some members do not belong to this event");
		}

		let teamMemberByUserId = new Map<string, string>();
		if (body.projectId) {
			const teamMembers = await prisma.teamMember.findMany({
				where: {
					userId: { in: members.map((m) => m.userId) },
					team: { projectId: body.projectId },
				},
				select: { id: true, userId: true },
			});

			teamMemberByUserId = new Map(teamMembers.map((tm) => [tm.userId, tm.id]));
			const missing = members.filter((m) => !teamMemberByUserId.has(m.userId));
			if (missing.length) {
				throw new BadRequestException(
					"Some selected users are not team members of the chosen project",
				);
			}
		}

		if (body.mentorIds?.length) {
			const found = await prisma.speciality.findMany({
				where: { id: { in: body.mentorIds } },
				select: { id: true },
			});
			if (found.length !== body.mentorIds.length) {
				throw new BadRequestException(
					"Some mentor specialities were not found",
				);
			}
		}

		const mentorsUpdate =
			body.mentorIds !== undefined
				? { set: body.mentorIds.map((id) => ({ id })) }
				: undefined;

		if (body.projectId !== undefined || mentorsUpdate) {
			// m2m relation updates can't go through updateMany — per-row update needed.
			await prisma.$transaction(
				members.map((m) =>
					prisma.eventMember.update({
						where: { id: m.id },
						data: {
							...(body.projectId !== undefined
								? {
										teamMemberId: body.projectId
											? (teamMemberByUserId.get(m.userId) ?? null)
											: null,
									}
								: {}),
							...(mentorsUpdate ? { mentors: mentorsUpdate } : {}),
						},
					}),
				),
			);
		}

		return { success: true, updated: members.length };
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
