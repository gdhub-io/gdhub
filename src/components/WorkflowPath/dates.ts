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
export const daysUntil = (iso: string) =>
	utc(iso).startOf("day").diff(dayjs.utc().startOf("day"), "day");

/** A stage's day, with the year only when it is not this one: "4 Jun", "12 Nov 2025". */
export const formatDay = (iso: string) => {
	const day = dayjs(iso);
	return day.year() === dayjs().year()
		? day.format("D MMM")
		: day.format("D MMM YYYY");
};

/** "4 Mar – 1 Apr 2025": the year once, and only when it is not this one. */
export const formatDayRange = (from: string, to: string) => {
	const a = dayjs(from);
	const b = dayjs(to);
	if (a.isSame(b, "day")) return formatDay(from);
	if (a.year() !== b.year()) return `${formatDay(from)} – ${formatDay(to)}`;
	return `${a.format("D MMM")} – ${formatDay(to)}`;
};
