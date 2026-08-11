import type { SkillLevel } from "@gdhub-io/gdhub-prisma";
import { EXPERT_MIN_LEVEL, skillLevelsAtLeast } from "@/helpers/speciality";
import { prisma } from "@/services/prisma";

type LevelQuery = {
	/** Defaults to the platform's expert threshold. */
	minLevel?: SkillLevel;
	/** Narrow to one work direction. */
	directionId?: string;
};

/**
 * Work directions the user is qualified in — has a speciality at `minLevel` or
 * above.
 *
 * This is the shape most callers want: a permission is not enough on its own
 * for anything scoped to a craft (running an event, mentoring, reviewing), and
 * the answer is always "which directions", never a plain yes/no.
 */
export async function getQualifiedDirectionIds(
	userId: string,
	{ minLevel = EXPERT_MIN_LEVEL }: LevelQuery = {},
): Promise<string[]> {
	const rows = await prisma.speciality.findMany({
		where: { userId, level: { in: skillLevelsAtLeast(minLevel) } },
		select: { workDirectionId: true },
		distinct: ["workDirectionId"],
	});

	return rows.map((row) => row.workDirectionId);
}

/**
 * Whether the user has a qualifying speciality — in a given direction when
 * `directionId` is passed, in any direction otherwise.
 */
export async function hasQualifiedSpeciality(
	userId: string,
	{ minLevel = EXPERT_MIN_LEVEL, directionId }: LevelQuery = {},
): Promise<boolean> {
	const count = await prisma.speciality.count({
		where: {
			userId,
			level: { in: skillLevelsAtLeast(minLevel) },
			...(directionId ? { workDirectionId: directionId } : {}),
		},
	});

	return count > 0;
}
