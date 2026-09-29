import dayjs from "dayjs";

/**
 * Which calendar bucket a timestamp falls into, in the viewer's timezone.
 * The list shows `HH:mm` for "today"; date separators say "Today".
 */
export type DayBucket =
	| { unit: "today" }
	| { unit: "yesterday" }
	| { unit: "weekday" }
	| { unit: "date"; withYear: boolean };

export function dayBucket(ts: number, now: Date = new Date()): DayBucket {
	const today = dayjs(now).startOf("day");
	const day = dayjs(ts).startOf("day");
	const daysAgo = today.diff(day, "day");

	if (daysAgo <= 0) return { unit: "today" };
	if (daysAgo === 1) return { unit: "yesterday" };
	if (daysAgo <= 6) return { unit: "weekday" };
	return { unit: "date", withYear: day.year() !== today.year() };
}
