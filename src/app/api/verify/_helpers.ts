import type { CheckpointVerdict } from "@gdhub-io/gdhub-prisma";
import { hubLegalEntity } from "@/config/legal/entities";
import { prisma } from "@/services/prisma";

export async function resolvePublicCertificate(number: string) {
	const certificate = await prisma.certificate.findUnique({
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

	// Course and checkpoint certificates are not issued yet; only an event one verifies here.
	const member = certificate?.eventMember;
	if (
		!certificate?.externalId ||
		certificate.externalId.startsWith("pending:") ||
		!member
	) {
		return null;
	}

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
		certificate: { ...certificate, externalId: certificate.externalId },
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

const personName = (u: {
	name: string | null;
	profile: { name: string | null } | null;
}) => u.profile?.name?.trim() || u.name?.trim() || "";

const person = {
	select: {
		name: true,
		image: true,
		profile: { select: { name: true } },
		specialities: {
			orderBy: { createdAt: "desc" },
			take: 1,
			select: { name: true },
		},
	},
} as const;

async function resolveEvent(
	number: string,
): Promise<VerifyCertificateResponse | null> {
	const data = await resolvePublicCertificate(number);
	if (!data) return null;
	return {
		number: data.certificate.number,
		issuedAt: data.certificate.issuedAt.toISOString(),
		source: "Event",
		signed: true,
		participant: {
			name: data.participantName,
			image: data.participantImage,
			position: data.participantPosition || null,
			specialty: data.participantSpecialty || null,
		},
		subject: {
			title: data.event.title,
			href: data.event.slug ? `/event/${data.event.slug}` : null,
			kind: data.event.type,
			lang: data.event.lang,
			startDate: data.startDate?.toISOString() ?? null,
			endDate: data.endDate?.toISOString() ?? null,
			issuerName: data.organizerName,
			issuerTitle: data.organizerTitle,
			mentorName: data.mentorName || null,
			mentorSpecialty: data.mentorSpecialty || null,
		},
		project: data.project
			? {
					name: data.project.name,
					slug: data.project.slug,
					coverImage: data.project.coverImage,
					shortDescription: data.project.description,
				}
			: null,
	};
}

/** A course or checkpoint certificate: unsigned, proven by this page alone. */
async function resolveUnsigned(
	number: string,
): Promise<VerifyCertificateResponse | null> {
	const c = await prisma.certificate.findUnique({
		where: { number },
		select: {
			number: true,
			issuedAt: true,
			source: true,
			revokedAt: true,
			user: person,
			courseGroupStudent: {
				select: {
					startedAt: true,
					finishedAt: true,
					group: {
						select: {
							course: {
								select: { name: true, slug: true, createdByUser: person },
							},
						},
					},
				},
			},
			checkpoint: {
				select: {
					stageName: true,
					startedAt: true,
					decidedAt: true,
					verdict: true,
					goal: true,
					curator: person,
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
	});
	if (!c || c.revokedAt) return null;

	const participant = {
		name: personName(c.user),
		image: c.user.image,
		position: null,
		specialty: c.user.specialities[0]?.name?.trim() || null,
	};
	const base = {
		number: c.number,
		issuedAt: c.issuedAt.toISOString(),
		signed: false,
		participant,
	};

	const course = c.courseGroupStudent?.group.course;
	if (c.source === "Course" && course && c.courseGroupStudent) {
		return {
			...base,
			source: "Course",
			subject: {
				title: course.name,
				href: `/course/${course.slug}`,
				kind: null,
				lang: null,
				startDate: c.courseGroupStudent.startedAt.toISOString(),
				endDate: c.courseGroupStudent.finishedAt?.toISOString() ?? null,
				issuerName: personName(course.createdByUser),
				issuerTitle: course.createdByUser.specialities[0]?.name?.trim() || "",
				mentorName: null,
				mentorSpecialty: null,
			},
			project: null,
		};
	}

	// Issued to the project by the platform; the founder carries it, named so
	// the result is not anonymous.
	const checkpoint = c.checkpoint;
	if (c.source === "Checkpoint" && checkpoint) {
		return {
			...base,
			source: "Checkpoint",
			subject: {
				title: checkpoint.stageName,
				// The project card below links to it; a second link would say the same.
				href: null,
				kind: null,
				lang: null,
				startDate: checkpoint.startedAt?.toISOString() ?? null,
				endDate: checkpoint.decidedAt?.toISOString() ?? null,
				issuerName: hubLegalEntity().name,
				issuerTitle: "",
				mentorName: checkpoint.curator ? personName(checkpoint.curator) : null,
				mentorSpecialty:
					checkpoint.curator?.specialities[0]?.name?.trim() || null,
			},
			outcome: { verdict: checkpoint.verdict, goal: checkpoint.goal },
			project: {
				name: checkpoint.project.name,
				slug: checkpoint.project.slug,
				coverImage: checkpoint.project.coverImage,
				shortDescription: checkpoint.project.description,
			},
		};
	}
	return null;
}

export async function getVerifyCertificate(
	number: string,
): Promise<VerifyCertificateResponse | null> {
	const found = await prisma.certificate.findUnique({
		where: { number },
		select: { source: true },
	});
	if (!found) return null;
	return found.source === "Event"
		? resolveEvent(number)
		: resolveUnsigned(number);
}

export type VerifyCertificateResponse = {
	number: string;
	issuedAt: string;
	source: "Event" | "Course" | "Checkpoint";
	/** Event certificates carry a Documenso signature and a signed PDF; the others do not. */
	signed: boolean;
	participant: {
		name: string;
		image: string | null;
		position: string | null;
		specialty: string | null;
	};
	/** What the certificate is for: the event, the course or the checkpoint. */
	subject: {
		title: string;
		href: string | null;
		/** The event type; null for a course or a checkpoint. */
		kind: string | null;
		lang: string | null;
		startDate: string | null;
		endDate: string | null;
		/** The organizer, the teacher or the curator. */
		issuerName: string;
		issuerTitle: string;
		mentorName: string | null;
		mentorSpecialty: string | null;
	};
	project: {
		name: string;
		slug: string;
		coverImage: string | null;
		shortDescription: string | null;
	} | null;
	/** A checkpoint's result: the verdict and the goal it was measured against. */
	outcome?: { verdict: CheckpointVerdict | null; goal: string };
};
