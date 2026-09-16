import { CURATOR_LEVELS, type CuratorLevel } from "@/config/checkpoint-pricing";
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
	}));
}

/**
 * The people a checkpoint can actually be given to.
 *
 * `Speciality.isOpenForMentoring` is the switch a specialist flips themselves;
 * `CURATOR_LEVELS` is the floor the checkpoint sets, and it is not the author's
 * to lower. There is no curator record yet, so a row is a speciality with its
 * user on it, and the rate and the record of past checkpoints arrive with
 * GDHUB-42.
 */
export type CheckpointCurator = {
	userId: string;
	specialityId: string;
	name: string;
	image: string | null;
	/** Speciality name — "Game Designer", "Technical Director". */
	role: string;
	specialization: string;
	level: CuratorLevel;
	summary: string;
};

export async function listCheckpointCurators(
	limit = 50,
): Promise<CheckpointCurator[]> {
	const specialities = await prisma.speciality.findMany({
		where: {
			isOpenForMentoring: true,
			level: { in: CURATOR_LEVELS },
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

	return specialities.map((speciality) => ({
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
	}));
}
