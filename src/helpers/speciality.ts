import { SkillLevel } from "@/config/prisma-enums";

/**
 * Skill levels, weakest first.
 *
 * The enum itself is unordered — Prisma gives us five names and no notion of
 * one being above another — so every "senior enough" rule in the app has to
 * spell the qualifying levels out. They were being spelled out by hand, and
 * `[Experienced, Expert]` already appeared verbatim in the experts directory,
 * the expert profile and the mentoring filters. This is that order, once.
 */
export const SKILL_LEVEL_ORDER = [
	SkillLevel.Novice,
	SkillLevel.Beginner,
	SkillLevel.Skillful,
	SkillLevel.Experienced,
	SkillLevel.Expert,
] as const;

/** Position on the ladder; `-1` for a value that is not a level at all. */
export function skillLevelRank(level: SkillLevel | string | null | undefined) {
	return SKILL_LEVEL_ORDER.indexOf(level as SkillLevel);
}

/** Whether `level` is at or above `minLevel`. */
export function meetsSkillLevel(
	level: SkillLevel | string | null | undefined,
	minLevel: SkillLevel,
) {
	const rank = skillLevelRank(level);
	return rank >= 0 && rank >= skillLevelRank(minLevel);
}

/**
 * The levels at or above `minLevel`, ready for a Prisma `{ level: { in } }`
 * filter. Querying by list rather than by comparison keeps the existing index
 * on `(userId, level)` usable.
 */
export function skillLevelsAtLeast(minLevel: SkillLevel): SkillLevel[] {
	return SKILL_LEVEL_ORDER.slice(skillLevelRank(minLevel)) as SkillLevel[];
}

/**
 * The threshold the platform treats as "expert in a direction": the level at
 * which a member may mentor, answer questions, and run an event for that
 * direction. One constant, so raising the bar is one edit.
 */
export const EXPERT_MIN_LEVEL = SkillLevel.Experienced;

/** `[Experienced, Expert]` — the expert threshold as a Prisma filter list. */
export const EXPERT_SKILL_LEVELS = skillLevelsAtLeast(EXPERT_MIN_LEVEL);
