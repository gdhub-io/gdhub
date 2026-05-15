import { randomBytes, randomUUID } from "node:crypto";
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
import {
	LegalService,
	MENTOR_SIGNATURE_FIELD,
	ORGANIZER_SIGNATURE_FIELD,
} from "@/services/legal";
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

// Crockford Base32 — 32 chars, no ambiguous I/L/O/U.
const CROCKFORD_BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function generateCertificateNumber(): string {
	const bytes = randomBytes(6);
	let suffix = "";
	for (let i = 0; i < 6; i++) {
		suffix += CROCKFORD_BASE32[bytes[i] & 0x1f]; // 5 random bits per char
	}
	return `GDH-${suffix}`;
}

async function resolveMemberCertificateContext(memberId: string) {
	const member = await prisma.eventMember.findUnique({
		where: { id: memberId },
		include: {
			event: {
				select: {
					id: true,
					title: true,
					type: true,
					createdById: true,
					certificationEnabled: true,
					certificationOrganizerName: true,
					certificationOrganizerTitle: true,
					createdBy: {
						select: {
							name: true,
							email: true,
							profile: { select: { name: true } },
							specialities: {
								orderBy: { createdAt: "asc" },
								take: 1,
								select: { name: true },
							},
						},
					},
					schedule: { select: { startDate: true, endDate: true } },
				},
			},
			user: {
				select: {
					id: true,
					name: true,
					email: true,
					profile: { select: { name: true } },
				},
			},
			teamMember: {
				select: {
					position: true,
					team: {
						select: { project: { select: { name: true } } },
					},
				},
			},
			mentors: {
				orderBy: { createdAt: "asc" },
				take: 1,
				select: {
					name: true,
					user: {
						select: {
							name: true,
							email: true,
							profile: { select: { name: true } },
						},
					},
				},
			},
			certificate: true,
		},
	});

	if (!member) return null;

	const event = member.event;

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

	const defaultOrganizerName =
		event.createdBy.profile?.name?.trim() || event.createdBy.name?.trim() || "";
	const defaultOrganizerTitle =
		event.createdBy.specialities[0]?.name?.trim() || "";

	const participantName =
		member.user.profile?.name?.trim() ||
		member.user.name?.trim() ||
		member.user.email?.trim() ||
		"";

	const mentor = member.mentors[0];
	const mentorName = mentor
		? mentor.user?.profile?.name?.trim() ||
			mentor.user?.name?.trim() ||
			mentor.name.trim()
		: "";
	const mentorEmail = mentor?.user?.email?.trim() || "";

	return {
		member,
		event,
		startDate,
		endDate,
		participantName,
		participantPosition: member.teamMember?.position?.trim() || "",
		projectName: member.teamMember?.team?.project?.name?.trim() || "",
		organizerName:
			event.certificationOrganizerName?.trim() || defaultOrganizerName,
		organizerTitle:
			event.certificationOrganizerTitle?.trim() || defaultOrganizerTitle,
		organizerEmail: event.createdBy.email?.trim() || "",
		mentorName,
		mentorEmail,
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

	@Post("/:id/members/:memberId/certificate")
	public async createMemberCertificate(
		@Req() req: NextApiRequestWithUser,
		@Param("id") id: string,
		@Param("memberId") memberId: string,
	) {
		const isAdmin = req.user.role === prismaClient.UserRole.Admin;

		const ctx = await resolveMemberCertificateContext(memberId);

		if (!ctx || ctx.event.id !== id) {
			throw new NotFoundException("Member not found");
		}

		if (!isAdmin && ctx.event.createdById !== req.user.id) {
			throw new ForbiddenException(
				"You are not allowed to manage certificates for this event",
			);
		}

		if (!ctx.event.certificationEnabled) {
			throw new BadRequestException(
				"Certification is not enabled for this event",
			);
		}

		if (ctx.member.certificate) {
			throw new BadRequestException(
				"Certificate has already been created for this member",
			);
		}

		const issuedAt = new Date();
		const legalService = new LegalService();

		// Two-phase create: first claim a unique number in the DB with a
		// placeholder externalId, then upload to Documenso, then update the row
		// with the real envelopeId. On Documenso failure we roll the row back
		// so no orphan PDFs are left in Documenso and no orphan rows in the DB.
		let claimedRow: { id: string; number: string } | null = null;
		let lastError: unknown;
		for (let attempt = 0; attempt < 3; attempt++) {
			const candidate = generateCertificateNumber();
			try {
				claimedRow = await prisma.eventCertificate.create({
					data: {
						eventMemberId: ctx.member.id,
						number: candidate,
						externalId: `pending:${candidate}`,
						issuedAt,
					},
					select: { id: true, number: true },
				});
				break;
			} catch (error) {
				if (
					error instanceof Prisma.PrismaClientKnownRequestError &&
					error.code === "P2002"
				) {
					const target = (error.meta as { target?: string[] } | undefined)
						?.target;
					// Conflict on eventMemberId means a parallel create won — no point retrying.
					if (target?.some((field) => field.includes("eventMemberId"))) {
						throw new BadRequestException(
							"Certificate has already been created for this member",
						);
					}
					lastError = error;
					continue;
				}
				throw error;
			}
		}

		if (!claimedRow) {
			throw lastError instanceof Error
				? lastError
				: new Error("Failed to allocate certificate number");
		}

		// Signers: organizer always, mentor only for GameLab events with a
		// mentor assigned. Matches the signature blocks rendered on the PDF.
		// Each signer carries a pre-placed signature field so Documenso shows
		// the field anchored to the right line in the certificate.
		const signers = [
			{
				name: ctx.organizerName,
				email: ctx.organizerEmail,
				signatureField: ORGANIZER_SIGNATURE_FIELD,
			},
			...(ctx.event.type === "GameLab" && ctx.mentorName && ctx.mentorEmail
				? [
						{
							name: ctx.mentorName,
							email: ctx.mentorEmail,
							signatureField: MENTOR_SIGNATURE_FIELD,
						},
					]
				: []),
		];

		try {
			const document = await legalService.createMemberCertificateDocument({
				memberId: ctx.member.id,
				memberEmail: ctx.member.user.email,
				memberName: ctx.participantName,
				certificateNumber: claimedRow.number,
				pdfInput: {
					eventType: ctx.event.type,
					organizerName: ctx.organizerName,
					organizerTitle: ctx.organizerTitle,
					startDate: ctx.startDate,
					endDate: ctx.endDate,
					participantName: ctx.participantName,
					participantPosition: ctx.participantPosition,
					projectName: ctx.projectName,
					eventTitle: ctx.event.title,
					certificateNumber: claimedRow.number,
					issuedDate: issuedAt,
					mentorName: ctx.mentorName,
				},
				signers,
			});

			const certificate = await prisma.eventCertificate.update({
				where: { id: claimedRow.id },
				data: { externalId: document.envelopeId },
			});

			return {
				id: certificate.id,
				number: certificate.number,
				externalId: certificate.externalId,
				issuedAt: certificate.issuedAt,
				documentId: document.documentId,
			};
		} catch (error) {
			await prisma.eventCertificate
				.delete({ where: { id: claimedRow.id } })
				.catch((rollbackError) => {
					console.error(
						"Failed to roll back certificate row after Documenso error",
						rollbackError,
					);
				});
			throw error;
		}
	}

	@Get("/:id/members/:memberId/certificate")
	public async getMemberCertificate(
		@Req() req: NextApiRequestWithUser,
		@Param("id") id: string,
		@Param("memberId") memberId: string,
	) {
		const isAdmin = req.user.role === prismaClient.UserRole.Admin;

		const member = await prisma.eventMember.findUnique({
			where: { id: memberId },
			select: {
				eventId: true,
				event: { select: { createdById: true } },
				certificate: true,
			},
		});

		if (!member || member.eventId !== id) {
			throw new NotFoundException("Member not found");
		}

		if (!isAdmin && member.event.createdById !== req.user.id) {
			throw new ForbiddenException(
				"You are not allowed to view certificates for this event",
			);
		}

		if (!member.certificate) return null;

		let status: string | null = null;
		const externalId = member.certificate.externalId;
		if (!externalId.startsWith("pending:")) {
			try {
				const envelope = await new LegalService().getEnvelope(externalId);
				status = envelope.status;
			} catch (error) {
				console.error("Failed to fetch envelope status", error);
			}
		}

		return {
			id: member.certificate.id,
			number: member.certificate.number,
			externalId: member.certificate.externalId,
			issuedAt: member.certificate.issuedAt,
			status,
		};
	}

	@Get("/:id/members/:memberId/certificate/pdf")
	public async getMemberCertificatePdf(
		@Req() req: NextApiRequestWithUser,
		@Res() res: NextApiResponse,
		@Param("id") id: string,
		@Param("memberId") memberId: string,
	) {
		const isAdmin = req.user.role === prismaClient.UserRole.Admin;

		const ctx = await resolveMemberCertificateContext(memberId);

		if (!ctx || ctx.event.id !== id) {
			throw new NotFoundException("Member not found");
		}

		if (!isAdmin && ctx.event.createdById !== req.user.id) {
			throw new ForbiddenException(
				"You are not allowed to view certificates for this event",
			);
		}

		if (!ctx.member.certificate) {
			throw new NotFoundException("Certificate has not been created yet");
		}

		const legalService = new LegalService();
		const pdfBytes = await legalService.generateEventCertificatePdf({
			eventType: ctx.event.type,
			organizerName: ctx.organizerName,
			organizerTitle: ctx.organizerTitle,
			startDate: ctx.startDate,
			endDate: ctx.endDate,
			participantName: ctx.participantName,
			participantPosition: ctx.participantPosition,
			projectName: ctx.projectName,
			eventTitle: ctx.event.title,
			certificateNumber: ctx.member.certificate.number,
			issuedDate: ctx.member.certificate.issuedAt,
			mentorName: ctx.mentorName,
		});

		res.setHeader("Content-Type", "application/pdf");
		res.setHeader(
			"Content-Disposition",
			`inline; filename="${ctx.member.certificate.number}.pdf"`,
		);
		res.setHeader("Cache-Control", "no-store");
		res.send(Buffer.from(pdfBytes));
	}

	@Get("/:id/members/:memberId/certificate/download")
	public async downloadMemberCertificate(
		@Req() req: NextApiRequestWithUser,
		@Res() res: NextApiResponse,
		@Param("id") id: string,
		@Param("memberId") memberId: string,
	) {
		const isAdmin = req.user.role === prismaClient.UserRole.Admin;

		const ctx = await resolveMemberCertificateContext(memberId);

		if (!ctx || ctx.event.id !== id) {
			throw new NotFoundException("Member not found");
		}

		if (!isAdmin && ctx.event.createdById !== req.user.id) {
			throw new ForbiddenException(
				"You are not allowed to view certificates for this event",
			);
		}

		if (!ctx.member.certificate) {
			throw new NotFoundException("Certificate has not been created yet");
		}

		const externalId = ctx.member.certificate.externalId;
		if (externalId.startsWith("pending:")) {
			throw new NotFoundException(
				"Certificate has not been uploaded to Documenso yet",
			);
		}

		const { bytes, contentType, filename } =
			await new LegalService().downloadSignedDocument(externalId);

		const fallbackName = `${ctx.member.certificate.number}.pdf`;
		res.setHeader("Content-Type", contentType);
		res.setHeader(
			"Content-Disposition",
			`attachment; filename="${filename ?? fallbackName}"`,
		);
		res.setHeader("Cache-Control", "no-store");
		res.send(Buffer.from(bytes));
	}

	@Post("/:id/members/:memberId/certificate/distribute")
	public async distributeMemberCertificate(
		@Req() req: NextApiRequestWithUser,
		@Param("id") id: string,
		@Param("memberId") memberId: string,
	) {
		const isAdmin = req.user.role === prismaClient.UserRole.Admin;

		const member = await prisma.eventMember.findUnique({
			where: { id: memberId },
			select: {
				eventId: true,
				event: { select: { createdById: true } },
				certificate: true,
			},
		});

		if (!member || member.eventId !== id) {
			throw new NotFoundException("Member not found");
		}

		if (!isAdmin && member.event.createdById !== req.user.id) {
			throw new ForbiddenException(
				"You are not allowed to manage certificates for this event",
			);
		}

		if (!member.certificate) {
			throw new NotFoundException("Certificate has not been created yet");
		}

		const externalId = member.certificate.externalId;
		if (externalId.startsWith("pending:")) {
			throw new BadRequestException(
				"Certificate document was not uploaded to Documenso",
			);
		}

		await new LegalService().distributeEnvelope(externalId);

		return { ok: true };
	}

	@Delete("/:id/members/:memberId/certificate")
	public async deleteMemberCertificate(
		@Req() req: NextApiRequestWithUser,
		@Param("id") id: string,
		@Param("memberId") memberId: string,
	) {
		const isAdmin = req.user.role === prismaClient.UserRole.Admin;

		const member = await prisma.eventMember.findUnique({
			where: { id: memberId },
			select: {
				eventId: true,
				event: { select: { createdById: true } },
				certificate: true,
			},
		});

		if (!member || member.eventId !== id) {
			throw new NotFoundException("Member not found");
		}

		if (!isAdmin && member.event.createdById !== req.user.id) {
			throw new ForbiddenException(
				"You are not allowed to manage certificates for this event",
			);
		}

		if (!member.certificate) {
			return { ok: true };
		}

		// Try to delete the envelope in Documenso. Skip the call if the stored
		// externalId is still a `pending:` placeholder (never uploaded), or if
		// Documenso returns 404 — we still want to clean up the DB row.
		const externalId = member.certificate.externalId;
		const legalService = new LegalService();
		if (!externalId.startsWith("pending:")) {
			if (!isAdmin) {
				try {
					const envelope = await legalService.getEnvelope(externalId);
					if (envelope.status === "COMPLETED") {
						throw new ForbiddenException(
							"Only administrators can delete a signed certificate",
						);
					}
				} catch (error) {
					if (error instanceof ForbiddenException) throw error;
					console.error(
						"Failed to fetch envelope status before delete; proceeding",
						error,
					);
				}
			}
			try {
				await legalService.deleteEnvelope(externalId);
			} catch (error) {
				console.error(
					"Failed to delete envelope in Documenso, removing local row anyway",
					error,
				);
			}
		}

		await prisma.eventCertificate.delete({
			where: { id: member.certificate.id },
		});

		return { ok: true };
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
				certificate: {
					select: {
						id: true,
						number: true,
						externalId: true,
						issuedAt: true,
					},
				},
			},
			orderBy: { createdAt: "asc" },
		});

		// Fetch envelope info from Documenso in parallel for members that
		// have a certificate. We grab status + team slug so we can build the
		// Documenso UI URL. Failures are ignored — the UI falls back to "Draft"
		// and hides the "View in Documenso" button.
		const legalService = new LegalService();
		const envelopeInfos = await Promise.all(
			members.map(async (m) => {
				if (!m.certificate) return null;
				const externalId = m.certificate.externalId;
				if (externalId.startsWith("pending:")) return null;
				try {
					const envelope = await legalService.getEnvelope(externalId);
					return {
						status: envelope.status,
						teamUrl: envelope.team.url,
					};
				} catch (error) {
					console.error(
						`Failed to fetch envelope for cert ${m.certificate.number}`,
						error,
					);
					return null;
				}
			}),
		);

		return members.map((m, i) => {
			if (!m.certificate) return { ...m, certificate: null };
			const info = envelopeInfos[i];
			return {
				...m,
				certificate: {
					...m.certificate,
					status: info?.status ?? null,
					documentUrl: info
						? legalService.getDocumentUrl({
								teamUrl: info.teamUrl,
								envelopeId: m.certificate.externalId,
							})
						: null,
				},
			};
		});
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
