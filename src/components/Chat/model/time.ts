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

type Translate = (key: string, fallback: string) => string;

/** Row time: `HH:mm` today, then "Yesterday", a weekday, a date. */
export function listStamp(ts: number, t: Translate, now = new Date()): string {
	const bucket = dayBucket(ts, now);
	switch (bucket.unit) {
		case "today":
			return dayjs(ts).format("HH:mm");
		case "yesterday":
			return t("chat.row.yesterday", "Yesterday");
		case "weekday":
			return dayjs(ts).format("ddd");
		case "date":
			return dayjs(ts).format(bucket.withYear ? "DD.MM.YYYY" : "D MMM");
	}
}
