import { prisma } from "@/services/prisma";

export async function resolvePublicCertificate(number: string) {
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
