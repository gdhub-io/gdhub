import dayjs from "dayjs";

/**
 * Checkpoint dates are UTC midnights stamped by the server; reading them in the
 * browser's zone would move a sprint boundary by a day for half the world.
 */
const utc = (iso: string) => dayjs.utc(iso);

/** "8 Sep". */
export const formatShort = (iso: string) => utc(iso).format("D MMM");

/** "1 – 28 Oct", or "14 Jul – 10 Aug" across a month. */
export const formatRange = (from: string, to: string) =>
	utc(from).month() === utc(to).month()
		? `${utc(from).format("D")} – ${utc(to).format("D MMM")}`
		: `${formatShort(from)} – ${formatShort(to)}`;

/** Whole days from today to a UTC date: 0 today, 1 tomorrow, negative past. */
export const daysUntil = (iso: string, now = new Date()) =>
	utc(iso).startOf("day").diff(dayjs.utc(now).startOf("day"), "day");
