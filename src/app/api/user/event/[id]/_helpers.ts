import { prisma } from "@/services/prisma";

export async function resolveEventCertificationContext(eventId: string) {
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

export async function resolveMemberCertificateContext(memberId: string) {
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
