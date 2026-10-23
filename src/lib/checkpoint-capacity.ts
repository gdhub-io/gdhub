import { SPRINTS_PER_CHECKPOINT } from "@/config/checkpoint";
import type { CuratorTeam } from "@/services/checkpoint-curator";

/**
 * The hours a team says it has for a checkpoint.
 *
 * `Profile.timeForWork` is the only commitment the platform collects: a range of
 * hours a week, stated once during onboarding. Summed over the roster and
 * multiplied by the four sprints, it is what decides whether a 28-day promise
 * fits — so the curator is given it instead of inventing a velocity.
 *
 * A member who stated nothing is not a member with zero hours. They are counted
 * in `members` and left out of the totals, and a team where nobody stated
 * anything has no totals at all: unknown, which the prompt must not read as
 * "nothing is reachable".
 */

type StatedHours = { timeForWork?: number[] | null };

/** `[min, max]`, tolerating a single figure and a range written backwards. */
export const weeklyRange = (hours: number[] | null | undefined) => {
	if (!hours?.length) return null;

	const [first, second = first] = hours;

	return { from: Math.min(first, second), to: Math.max(first, second) };
};

export const teamCapacity = (members: StatedHours[]): CuratorTeam => {
	const stated = members.flatMap((member) => {
		const range = weeklyRange(member.timeForWork);

		return range ? [range] : [];
	});

	const hoursPerWeek = stated.length
		? stated.reduce((total, range) => ({
				from: total.from + range.from,
				to: total.to + range.to,
			}))
		: null;

	return {
		members: members.length,
		stated: stated.length,
		hoursPerWeek,
		hoursPerRun: hoursPerWeek && {
			from: hoursPerWeek.from * SPRINTS_PER_CHECKPOINT,
			to: hoursPerWeek.to * SPRINTS_PER_CHECKPOINT,
		},
	};
};

/** An hours range as it is read aloud: one figure when both ends agree. */
export const hoursSpan = (range: { from: number; to: number }) =>
	range.from === range.to ? `${range.from}` : `${range.from}–${range.to}`;
