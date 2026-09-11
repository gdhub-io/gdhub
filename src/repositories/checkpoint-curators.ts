import { EXPERT_SKILL_LEVELS } from "@/helpers/speciality";
import { prisma } from "@/services/prisma";

export type FeaturedCurator = {
	id: string;
	/** Speciality name — "Game Designer", "Technical Director". */
	role: string;
	name: string;
	specialization: string;
	summary: string;
	image: string | null;
	/** What the specialist takes questions on. */
	topics: string[];
};

/** No curator record yet — the experts set, `isFeatured` first then most-read. */
export async function getFeaturedCurators(
	limit = 3,
): Promise<FeaturedCurator[]> {
	const specialities = await prisma.speciality.findMany({
		where: {
			level: { in: EXPERT_SKILL_LEVELS },
			isOpenForMentoring: true,
			openForQuestions: { isEmpty: false },
			summary: { not: null },
		},
		orderBy: [{ isFeatured: "desc" }, { viewsCount: "desc" }],
		take: limit,
		select: {
			id: true,
			name: true,
			specialization: true,
			summary: true,
			openForQuestions: true,
			user: {
				select: {
					name: true,
					image: true,
					profile: { select: { name: true } },
				},
			},
		},
	});

	return specialities.map((speciality) => ({
		id: speciality.id,
		role: speciality.name,
		name: speciality.user.profile?.name ?? speciality.user.name ?? "",
		specialization: speciality.specialization,
		summary: speciality.summary ?? "",
		image: speciality.user.image,
		topics: speciality.openForQuestions.slice(0, 3),
	}));
}
