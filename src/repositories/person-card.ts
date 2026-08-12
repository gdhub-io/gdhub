import { AdviceRequestStatus, TeamMemberStatus } from "@gdhub-io/gdhub-prisma";
import { getCleanTextContent } from "@/helpers/content";
import { prisma } from "@/services/prisma";

/**
 * The parts a person's card is made of, wherever it is shown.
 *
 * The talent card and the expert card draw the same person from two entry
 * points — one from a speciality, one from a user — and both need the same
 * projects and certificates. Keeping the selects and the mapping here is what
 * stops the two cards from slowly disagreeing about what a project row says.
 */

// The compact project card clamps the pitch at this length.
const DESCRIPTION_LIMIT = 500;

// Confirmed memberships surface as "projects the person works on". An
// applicant/rejected/fired row is not a real participation.
export const CONFIRMED_MEMBER_STATUSES = [
	TeamMemberStatus.Hired,
	TeamMemberStatus.Founder,
];

/** Memberships, newest first, with everything a project row draws. */
export const personCardProjectsSelect = {
	where: { status: { in: CONFIRMED_MEMBER_STATUSES } },
	orderBy: { startedAt: "desc" },
	select: {
		position: true,
		status: true,
		startedAt: true,
		finishedAt: true,
		team: {
			select: {
				_count: {
					select: {
						members: { where: { status: { in: CONFIRMED_MEMBER_STATUSES } } },
					},
				},
				project: {
					select: {
						id: true,
						name: true,
						slug: true,
						coverImage: true,
						description: true,
						videoLink: true,
						genre: true,
						platform: true,
						status: true,
						author: { select: { name: true, image: true } },
					},
				},
			},
		},
	},
} as const;

/**
 * Confirmed event certificates only — a `pending:` externalId is a placeholder
 * from before the document was actually issued.
 */
export const personCardCertificatesSelect = {
	where: { certificate: { externalId: { not: { startsWith: "pending:" } } } },
	orderBy: { createdAt: "desc" },
	select: {
		event: {
			select: {
				title: true,
				type: true,
				slug: true,
				image: true,
				certificationOrganizerName: true,
			},
		},
		certificate: { select: { number: true, issuedAt: true } },
		mentors: { select: { name: true, user: { select: { name: true } } } },
	},
} as const;

type MembershipRow = {
	position: string | null;
	status: string;
	startedAt: Date | null;
	finishedAt: Date | null;
	team: {
		_count: { members: number };
		project: {
			id: string;
			name: string;
			slug: string | null;
			coverImage: string | null;
			description: string | null;
			videoLink: string | null;
			genre: string | null;
			platform: string | null;
			status: string;
			author: { name: string | null; image: string | null } | null;
		} | null;
	} | null;
};

type CertificateRow = {
	event: {
		title: string;
		type: string;
		slug: string | null;
		image: string | null;
		certificationOrganizerName: string | null;
	} | null;
	certificate: { number: string; issuedAt: Date } | null;
	mentors: { name: string | null; user: { name: string | null } | null }[];
};

export function mapPersonCardProjects(memberships: MembershipRow[]) {
	return memberships
		.map((member) => {
			const project = member.team?.project;
			if (!project) return null;

			return {
				id: project.id,
				name: project.name,
				slug: project.slug,
				coverImage: project.coverImage,
				// The compact card shows a short plain-text pitch — don't ship the
				// whole description (or its markdown) for every membership.
				description: project.description
					? getCleanTextContent(project.description, DESCRIPTION_LIMIT)
					: null,
				videoLink: project.videoLink,
				genre: project.genre,
				platform: project.platform,
				projectStatus: project.status,
				author: project.author
					? { name: project.author.name, image: project.author.image }
					: null,
				// Confirmed members only — matches the "team size" shown on the card.
				teamSize: member.team?._count.members ?? 0,
				role: member.position,
				status: member.status,
				startedAt: member.startedAt,
				finishedAt: member.finishedAt,
				active: !member.finishedAt,
			};
		})
		.filter((project): project is NonNullable<typeof project> => !!project);
}

export function mapPersonCardCertificates(rows: CertificateRow[]) {
	return rows
		.map((member) => {
			if (!member.certificate) return null;

			return {
				number: member.certificate.number,
				issuedAt: member.certificate.issuedAt,
				mentors: member.mentors
					.map((mentor) => mentor.user?.name || mentor.name)
					.filter(Boolean),
				event: member.event
					? {
							title: member.event.title,
							type: member.event.type,
							slug: member.event.slug,
							image: member.event.image,
							organizerName: member.event.certificationOrganizerName,
						}
					: null,
			};
		})
		.filter(
			(certificate): certificate is NonNullable<typeof certificate> =>
				!!certificate,
		);
}

/**
 * How many projects this person has actually advised.
 *
 * Counted the same way the admin table and the skill capital count it: advice
 * that was delivered (`Executed`/`Closed` with a `finishedAt`) and attached to a
 * project. Distinct, because advising one project three times is still one
 * project helped.
 */
export async function countHelpedProjects(userId: string): Promise<number> {
	const projects = await prisma.adviceRequest.findMany({
		where: {
			toUserId: userId,
			status: {
				in: [AdviceRequestStatus.Closed, AdviceRequestStatus.Executed],
			},
			projectId: { not: null },
			finishedAt: { not: null },
		},
		distinct: ["projectId"],
		select: { projectId: true },
	});

	return projects.length;
}
