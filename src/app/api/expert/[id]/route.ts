import { EXPERT_SKILL_LEVELS } from "@/helpers/speciality";
import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import {
	countHelpedProjects,
	mapPersonCardCertificates,
	mapPersonCardProjects,
	personCardCertificatesSelect,
	personCardProjectsSelect,
} from "@/repositories/user/person-card";
import { prisma } from "@/services/prisma";

/**
 * A speciality is only an expert one when its owner offers advice on it: the
 * level is high enough, the mentorship switch is on, and there is at least one
 * question they are open to. The card and the list agree on this — a person who
 * turned mentorship off disappears from both.
 */
const EXPERT_SPECIALITY_WHERE = {
	level: { in: EXPERT_SKILL_LEVELS },
	isOpenForMentoring: true,
	openForQuestions: { isEmpty: false },
};

export const GET = withAuth({ mode: "user" })(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { id } = (await ctx.params) as { id: string };

	const expert = await prisma.user.findFirst({
		where: { id, specialities: { some: EXPERT_SPECIALITY_WHERE } },
		select: {
			id: true,
			name: true,
			image: true,
			profile: { select: { name: true, country: true, city: true } },
			specialities: {
				where: EXPERT_SPECIALITY_WHERE,
				orderBy: { createdAt: "asc" },
				select: {
					id: true,
					name: true,
					level: true,
					summary: true,
					// The card's only outbound link — it lives on the speciality, the
					// same place the talent card reads it from.
					portfolioUrl: true,
					specialization: true,
					// The professional block, the same four fields the talent card
					// shows — an expert card that said less about the person than
					// their talent card would be a strange thing to send someone to.
					jobs: true,
					tools: true,
					schools: true,
					skills: true,
					timeForMentoring: true,
					openForQuestions: true,
					direction: { select: { id: true, name: true } },
				},
			},
			memberInTeams: personCardProjectsSelect,
			memberInEvents: personCardCertificatesSelect,
		},
	});

	if (!expert) return apiError.notFound("Expert not found");

	return json({
		id: expert.id,
		name: expert.name,
		image: expert.image,
		profile: expert.profile,
		specialities: expert.specialities,
		projects: mapPersonCardProjects(expert.memberInTeams),
		certificates: mapPersonCardCertificates(expert.memberInEvents),
		// Shown as social proof rather than a statistic, so the card only draws it
		// once there is a track record to speak of — see the card for the
		// threshold. Counted here regardless: the number is cheap and the rule
		// belongs where the design states it.
		helpedProjectsCount: await countHelpedProjects(expert.id),
	});
});
