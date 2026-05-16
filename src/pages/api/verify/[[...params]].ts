import type { NextApiResponse } from "next";
import {
	createHandler,
	Get,
	NotFoundException,
	Param,
	Res,
} from "next-api-decorators";
import { LegalService } from "@/services/legal";
import { prisma } from "@/services/prisma";

async function resolvePublicCertificate(number: string) {
	const certificate = await prisma.eventCertificate.findUnique({
		where: { number },
		include: {
			eventMember: {
				include: {
					event: {
						select: {
							id: true,
							slug: true,
							lang: true,
							title: true,
							type: true,
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
							schedule: { select: { startDate: true, endDate: true } },
						},
					},
					user: {
						select: {
							image: true,
							name: true,
							profile: { select: { name: true } },
							specialities: {
								orderBy: { createdAt: "desc" },
								take: 1,
								select: { name: true },
							},
						},
					},
					teamMember: {
						select: {
							position: true,
							team: {
								select: {
									project: {
										select: {
											name: true,
											slug: true,
											coverImage: true,
											description: true,
										},
									},
								},
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
									profile: { select: { name: true } },
									specialities: {
										orderBy: { createdAt: "desc" },
										take: 1,
										select: { name: true },
									},
								},
							},
						},
					},
				},
			},
		},
	});

	if (!certificate || certificate.externalId.startsWith("pending:")) {
		return null;
	}

	const member = certificate.eventMember;
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
		member.user.profile?.name?.trim() || member.user.name?.trim() || "";

	const mentor = member.mentors[0];
	const mentorName = mentor
		? mentor.user?.profile?.name?.trim() ||
			mentor.user?.name?.trim() ||
			mentor.name.trim()
		: "";
	const mentorSpecialty = mentor?.user?.specialities[0]?.name?.trim() || "";

	return {
		certificate,
		event,
		startDate,
		endDate,
		participantName,
		participantImage: member.user.image,
		participantPosition: member.teamMember?.position?.trim() || "",
		participantSpecialty: member.user.specialities[0]?.name?.trim() || "",
		project: member.teamMember?.team?.project ?? null,
		organizerName:
			event.certificationOrganizerName?.trim() || defaultOrganizerName,
		organizerTitle:
			event.certificationOrganizerTitle?.trim() || defaultOrganizerTitle,
		mentorName,
		mentorSpecialty,
	};
}

export type VerifyCertificateResponse = {
	number: string;
	issuedAt: string;
	participant: {
		name: string;
		image: string | null;
		position: string | null;
		specialty: string | null;
	};
	event: {
		id: string;
		slug: string | null;
		lang: string;
		title: string;
		type: string;
		startDate: string | null;
		endDate: string | null;
		organizerName: string;
		organizerTitle: string;
		mentorName: string | null;
		mentorSpecialty: string | null;
	};
	project: {
		name: string;
		slug: string;
		coverImage: string | null;
		shortDescription: string | null;
	} | null;
};

class ApiVerifyEndpointHandler {
	@Get("/:number")
	public async getCertificate(@Param("number") number: string) {
		const ctx = await resolvePublicCertificate(number);

		if (!ctx) {
			throw new NotFoundException("Certificate not found");
		}

		const response: VerifyCertificateResponse = {
			number: ctx.certificate.number,
			issuedAt: ctx.certificate.issuedAt.toISOString(),
			participant: {
				name: ctx.participantName,
				image: ctx.participantImage,
				position: ctx.participantPosition || null,
				specialty: ctx.participantSpecialty || null,
			},
			event: {
				id: ctx.event.id,
				slug: ctx.event.slug,
				lang: ctx.event.lang,
				title: ctx.event.title,
				type: ctx.event.type,
				startDate: ctx.startDate?.toISOString() ?? null,
				endDate: ctx.endDate?.toISOString() ?? null,
				organizerName: ctx.organizerName,
				organizerTitle: ctx.organizerTitle,
				mentorName: ctx.mentorName || null,
				mentorSpecialty: ctx.mentorSpecialty || null,
			},
			project: ctx.project
				? {
						name: ctx.project.name,
						slug: ctx.project.slug,
						coverImage: ctx.project.coverImage,
						shortDescription: ctx.project.description,
					}
				: null,
		};

		return response;
	}

	@Get("/:number/pdf")
	public async getPdf(
		@Res() res: NextApiResponse,
		@Param("number") number: string,
	) {
		const ctx = await resolvePublicCertificate(number);

		if (!ctx) {
			throw new NotFoundException("Certificate not found");
		}

		const fallbackName = `${ctx.certificate.number}.pdf`;
		const { bytes, contentType, filename } =
			await new LegalService().downloadSignedDocument(
				ctx.certificate.externalId,
			);

		res.setHeader("Content-Type", contentType);
		res.setHeader(
			"Content-Disposition",
			`inline; filename="${filename ?? fallbackName}"`,
		);
		res.setHeader("Cache-Control", "no-store");
		res.send(Buffer.from(bytes));
	}

	@Get("/:number/download")
	public async download(
		@Res() res: NextApiResponse,
		@Param("number") number: string,
	) {
		const ctx = await resolvePublicCertificate(number);

		if (!ctx) {
			throw new NotFoundException("Certificate not found");
		}

		const fallbackName = `${ctx.certificate.number}.pdf`;
		const { bytes, contentType, filename } =
			await new LegalService().downloadSignedDocument(
				ctx.certificate.externalId,
			);

		res.setHeader("Content-Type", contentType);
		res.setHeader(
			"Content-Disposition",
			`attachment; filename="${filename ?? fallbackName}"`,
		);
		res.setHeader("Cache-Control", "no-store");
		res.send(Buffer.from(bytes));
	}
}

export default createHandler(ApiVerifyEndpointHandler);
