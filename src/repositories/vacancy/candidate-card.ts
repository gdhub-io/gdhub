import {
	mapPersonCardCertificates,
	mapPersonCardProjects,
	personCardCertificatesSelect,
	personCardProjectsSelect,
} from "@/repositories/user/person-card";
import { prisma } from "@/services/prisma";

/**
 * One application as the project reviewing it reads it (frame 04.07).
 *
 * Its own select, never the talent card's: the project sees the contacts the
 * candidate chose to share with this application and nothing the talent card
 * keeps behind an accepted offer — no other matches, no chat, no hidden email.
 */
export async function getCandidateCard(applicationId: string) {
	const application = await prisma.vacancyApplication.findUnique({
		where: { id: applicationId },
		select: {
			id: true,
			status: true,
			message: true,
			allowedContacts: true,
			createdAt: true,
			vacancy: {
				select: {
					id: true,
					title: true,
					teamId: true,
					team: { select: { project: { select: { name: true } } } },
				},
			},
			speciality: {
				select: {
					id: true,
					name: true,
					level: true,
					specialization: true,
					skills: true,
					tools: true,
					jobs: true,
					schools: true,
					portfolioUrl: true,
					direction: { select: { name: true } },
				},
			},
			user: {
				select: {
					id: true,
					name: true,
					image: true,
					email: true,
					updatedAt: true,
					profile: {
						select: {
							name: true,
							country: true,
							city: true,
							timeForWork: true,
							motivation: true,
							tgNickname: true,
							preferredGenres: { select: { name: true } },
							preferredSettings: { select: { name: true } },
							preferredLevels: { select: { name: true } },
						},
					},
					memberInTeams: personCardProjectsSelect,
					memberInEvents: personCardCertificatesSelect,
				},
			},
		},
	});
	if (!application) return null;

	const { user, vacancy, speciality, allowedContacts, ...rest } = application;
	const profile = user.profile;

	return {
		...rest,
		allowedContacts,
		vacancy: {
			id: vacancy.id,
			title: vacancy.title,
			teamId: vacancy.teamId,
			projectName: vacancy.team.project?.name ?? null,
		},
		speciality,
		candidate: {
			id: user.id,
			name: profile?.name || user.name,
			image: user.image,
			updatedAt: user.updatedAt,
			// Only what this application shares; anything else stays with the candidate.
			email: allowedContacts.includes("email") ? user.email : null,
			telegram: allowedContacts.includes("telegram")
				? (profile?.tgNickname ?? null)
				: null,
			location:
				[profile?.country, profile?.city].filter(Boolean).join(", ") || null,
			timeForWork: profile?.timeForWork ?? null,
			about: profile?.motivation ?? null,
			preferredGenres: profile?.preferredGenres ?? [],
			preferredSettings: profile?.preferredSettings ?? [],
			preferredLevels: profile?.preferredLevels ?? [],
		},
		projects: mapPersonCardProjects(user.memberInTeams),
		certificates: mapPersonCardCertificates(user.memberInEvents),
	};
}

export type CandidateCard = NonNullable<
	Awaited<ReturnType<typeof getCandidateCard>>
>;
