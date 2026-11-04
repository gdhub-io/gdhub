import dayjs from "dayjs";
import {
	type AvailabilityRule,
	clock,
	type MinuteRange,
} from "@/lib/advisor-availability";

/** 2024-01-01 is a Monday, so weekday 1..7 lands on Mon..Sun in the active locale. */
export const weekdayLabel = (weekday: number) =>
	dayjs("2024-01-01")
		.add(weekday - 1, "day")
		.format("ddd");

export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

/** Consecutive days collapse into a run: [1,2,3,5] reads "Mon – Wed, Fri". */
export const formatWeekdays = (weekdays: number[]) => {
	const sorted = [...new Set(weekdays)].sort((a, b) => a - b);
	const runs: number[][] = [];

	for (const weekday of sorted) {
		const last = runs.at(-1);
		if (last && last[last.length - 1] === weekday - 1) last.push(weekday);
		else runs.push([weekday]);
	}

	return runs
		.map((run) =>
			run.length > 2
				? `${weekdayLabel(run[0])} – ${weekdayLabel(run[run.length - 1])}`
				: run.map(weekdayLabel).join(", "),
		)
		.join(", ");
};

export const formatRanges = (ranges: MinuteRange[]) =>
	ranges.map((range) => `${clock(range.from)} – ${clock(range.to)}`).join(", ");

/** "July 2027", "January – August 2027", "November 2027 – February 2028"; null for every week. */
export const formatMonths = (rule: AvailabilityRule) => {
	if (!rule.monthFrom || !rule.monthTo) return null;

	const from = dayjs(rule.monthFrom);
	const to = dayjs(rule.monthTo);

	if (from.isSame(to, "month")) return from.format("MMMM YYYY");
	if (from.isSame(to, "year"))
		return `${from.format("MMMM")} – ${to.format("MMMM YYYY")}`;

	return `${from.format("MMMM YYYY")} – ${to.format("MMMM YYYY")}`;
};
