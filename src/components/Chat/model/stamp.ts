import dayjs from "dayjs";
import { dayBucket } from "./time";

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
