import {
	CHECKPOINT_DAYS,
	SPRINT_DAYS,
	SPRINTS_PER_CHECKPOINT,
} from "@/config/checkpoint";
import { dayNumberOn, utcStartOfDay } from "@/lib/checkpoints/days";
import type { CheckpointSprintDto } from "@/types/checkpoints";

/**
 * The four sprints inside a checkpoint.
 *
 * A sprint is seven days counted from the day the checkpoint started, so it runs
 * Tuesday to Monday as readily as Monday to Sunday — which is why nothing on
 * screen calls it a week. The boundaries are derived rather than stored: the only
 * sprint number in the database is the one on `CheckpointPulse`, and everything
 * else — devlogs, artifacts — is filed by the date it landed on.
 */

const clampSprint = (sprint: number) =>
	Math.min(Math.max(sprint, 1), SPRINTS_PER_CHECKPOINT);

/** Which sprint a day of the checkpoint belongs to. Days outside 1–28 clamp. */
export const sprintOfDay = (day: number) =>
	clampSprint(Math.ceil(day / SPRINT_DAYS));

/** The day numbers a sprint covers: sprint 2 is days 8 to 14. */
export const sprintDayRange = (sprint: number) => {
	const lastDay = clampSprint(sprint) * SPRINT_DAYS;

	return { firstDay: lastDay - SPRINT_DAYS + 1, lastDay };
};

/**
 * The devlog of a sprint is due on its last day, with everything else the
 * sprint asks: the call that opens the next one is the day after at the earliest.
 */
export const devlogDayOf = (sprint: number) => sprintDayRange(sprint).lastDay;

/** The dates a sprint covers, both at UTC midnight and both inclusive. */
export const sprintRange = (startedAt: Date, sprint: number) => {
	const { firstDay, lastDay } = sprintDayRange(sprint);
	const start = utcStartOfDay(startedAt);
	const from = new Date(start);
	from.setUTCDate(from.getUTCDate() + firstDay - 1);
	const to = new Date(start);
	to.setUTCDate(to.getUTCDate() + lastDay - 1);

	return { from, to };
};

/**
 * The sprint a devlog or an artifact falls into, or null when it landed outside
 * the 28 days. Null is not a defect: an artifact made before the checkpoint can
 * still be offered as evidence, it just belongs to no sprint.
 */
export const sprintOfDate = (startedAt: Date, at: Date) => {
	// `dayNumberOn` floors at day 1, so anything earlier has to be caught here.
	if (utcStartOfDay(at) < utcStartOfDay(startedAt)) return null;

	const day = dayNumberOn(startedAt, at);

	if (day > CHECKPOINT_DAYS) return null;

	return sprintOfDay(day);
};

/** The sprint under way, clamped to the last one once the 28 days are over. */
export const currentSprint = (startedAt: Date, now = new Date()) =>
	sprintOfDay(dayNumberOn(startedAt, now));

/** The four sprints, or nothing at all: a draft has no dates to divide. */
export const buildSprints = (startedAt: Date | null): CheckpointSprintDto[] => {
	if (!startedAt) return [];

	const now = new Date();
	const today = utcStartOfDay(now);
	const current = currentSprint(startedAt, now);

	return Array.from({ length: SPRINTS_PER_CHECKPOINT }, (_, index) => {
		const number = index + 1;
		const { from, to } = sprintRange(startedAt, number);
		const { firstDay, lastDay } = sprintDayRange(number);
		// `currentSprint` clamps to the fourth, so a finished sprint is decided by
		// its last day rather than by which one it names.
		const state =
			to < today ? "done" : number === current ? "current" : "ahead";

		return {
			number,
			from: from.toISOString(),
			to: to.toISOString(),
			firstDay,
			lastDay,
			devlogDay: devlogDayOf(number),
			state,
		} satisfies CheckpointSprintDto;
	});
};
