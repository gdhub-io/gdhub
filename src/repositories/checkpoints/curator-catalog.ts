import type { Prisma } from "@gdhub-io/gdhub-prisma";
import { CURATOR_LEVELS, type CuratorLevel } from "@/config/checkpoint-pricing";
import { EXPERT_SKILL_LEVELS } from "@/helpers/speciality";
import { earliestFirstCalls } from "@/repositories/advisor/availability";
import { prisma } from "@/services/prisma";
import type { CheckpointCurator, FeaturedCurator } from "@/types/checkpoints";
/** No curator record yet — the experts set, `isFeatured` first then most-read. */
export async function getFeaturedCurators(
	limit = 4,
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
			level: true,
			summary: true,
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
		level: speciality.level,
		summary: speciality.summary ?? "",
		image: speciality.user.image,
	}));
}

/**
 * Who may curate a checkpoint: someone open to mentees at Experienced or Expert,
 * who turned project curation on, whom an admin approved, and who curates this
 * stage. The list, the price and the PUT that names a curator all read this one rule.
 */
export const curatorEligibleWhere = (stage?: string) =>
	({
		isOpenForMentoring: true,
		level: { in: CURATOR_LEVELS },
		user: {
			expertProfile: {
				curation: true,
				curatorApprovedAt: { not: null },
				...(stage && { curatorStages: { has: stage } }),
			},
		},
	}) satisfies Prisma.SpecialityWhereInput;

export const isEligibleCurator = async (curatorId: string, stage: string) =>
	!!(await prisma.speciality.findFirst({
		where: {
			...curatorEligibleWhere(stage),
			userId: curatorId,
		},
		select: { id: true },
	}));

export async function listCheckpointCurators(
	viewerId: string,
	stage?: string,
	limit = 50,
): Promise<CheckpointCurator[]> {
	const specialities = await prisma.speciality.findMany({
		where: {
			...curatorEligibleWhere(stage),
			// A curator buying a checkpoint for their own project cannot be its
			// curator: the point of the 28 days is judgement from outside.
			userId: { not: viewerId },
		},
		orderBy: [{ isFeatured: "desc" }, { viewsCount: "desc" }],
		take: limit,
		select: {
			id: true,
			name: true,
			specialization: true,
			summary: true,
			level: true,
			user: {
				select: {
					id: true,
					name: true,
					image: true,
					profile: { select: { name: true } },
				},
			},
		},
	});

	// Only someone with five free weeks in a row can be picked, however far ahead.
	const earliest = await earliestFirstCalls([
		...new Set(specialities.map((speciality) => speciality.user.id)),
	]);

	return specialities.flatMap((speciality) => {
		const firstCallFrom = earliest.get(speciality.user.id);
		if (!firstCallFrom) return [];

		return [
			{
				userId: speciality.user.id,
				specialityId: speciality.id,
				name: speciality.user.profile?.name ?? speciality.user.name ?? "",
				image: speciality.user.image,
				role: speciality.name,
				specialization: speciality.specialization,
				// The `where` above is what narrows it: a level with no price is never
				// selected, so it can never reach this row.
				level: speciality.level as CuratorLevel,
				summary: speciality.summary ?? "",
				firstCallFrom,
			},
		];
	});
}
