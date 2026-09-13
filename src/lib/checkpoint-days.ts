import { CHECKPOINT_DAYS } from "@/schemas/checkpoint";

/**
 * The 28 days, counted once.
 *
 * Browser-safe on purpose: the server stamps the day number onto every payload,
 * and the thread on the checkpoint page dates each entry against the same start.
 * Two implementations of this arithmetic would eventually disagree by one.
 */

/** Day 1 is `startedAt`; the 28th day is the checkpoint itself. */
export const dueDateFrom = (startedAt: Date) => {
	const due = new Date(startedAt);
	due.setUTCDate(due.getUTCDate() + CHECKPOINT_DAYS - 1);

	return due;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const utcMidnight = (date: Date) =>
	Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

/**
 * Which of the 28 days a checkpoint is on, counted in UTC.
 *
 * Counted from midnight to midnight rather than from the hour it started, so a
 * checkpoint bought at 23:50 is not on day 2 ten minutes later. The server sends
 * the number with the payload because a browser in another timezone would
 * otherwise show a different day for the same checkpoint, and the deadline is
 * the product.
 */
export const checkpointDay = (startedAt: Date, now = new Date()) =>
	Math.min(dayNumberOn(startedAt, now), CHECKPOINT_DAYS);

/**
 * The same count without the ceiling, for dating an event rather than saying
 * where the checkpoint is. A verdict lands on day 29 and the thread says so.
 */
export const dayNumberOn = (startedAt: Date, at: Date) => {
	const elapsed = (utcMidnight(at) - utcMidnight(startedAt)) / MS_PER_DAY;

	return Math.max(elapsed + 1, 1);
};

/** The day number and days left, or nulls for a checkpoint that has not started. */
export const checkpointProgress = (
	startedAt: Date | null,
	now = new Date(),
) => {
	if (!startedAt) return { day: null, daysLeft: null };

	const day = checkpointDay(startedAt, now);

	return { day, daysLeft: CHECKPOINT_DAYS - day };
};
