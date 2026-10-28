import dayjs, { type Dayjs } from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import {
	AVAILABILITY_SEARCH_DAYS,
	AVAILABILITY_STALE_DAYS,
	FIRST_CALL_MIN_DAYS,
	SESSION_MINUTES,
	SESSIONS_PER_CHECKPOINT,
	SPRINT_DAYS,
} from "@/config/checkpoint";
import { AdvisorAvailabilityStatus } from "@/config/prisma-enums";

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * An advisor's hours and what can be booked in them (GDHUB-84). One schedule
 * serves every activity; whatever is booked — a checkpoint call or a
 * consultation — takes its time from all of them. Browser-safe: the server
 * decides, the picker shows the same answer.
 */

export type Activity = "consultations" | "checkpoints";

/** Minutes from midnight in the advisor's zone, `to` exclusive. */
export type MinuteRange = { from: number; to: number };

export type AvailabilityRule = {
	/** `YYYY-MM-DD`, the first day of the first month; null for every week. */
	monthFrom: string | null;
	/** `YYYY-MM-DD`, the last day of the last month. */
	monthTo: string | null;
	/** 1 = Monday … 7 = Sunday. */
	weekdays: number[];
	ranges: MinuteRange[];
	forConsultations: boolean;
	forCheckpoints: boolean;
};

export type Availability = {
	timeZone: string;
	status: AdvisorAvailabilityStatus;
	awayUntil: Date | null;
	confirmedAt: Date | null;
	rules: AvailabilityRule[];
};

export type Busy = { start: Date; end: Date };

const span = (rule: AvailabilityRule) =>
	rule.monthFrom && rule.monthTo
		? dayjs(rule.monthTo).diff(dayjs(rule.monthFrom), "day")
		: Number.POSITIVE_INFINITY;

const covers = (rule: AvailabilityRule, date: string) =>
	!rule.monthFrom ||
	!rule.monthTo ||
	(date >= rule.monthFrom && date <= rule.monthTo);

/**
 * The hours of one local day. The narrowest period covering the day decides it
 * whole: a period with months replaces the weekly hours in those months, and a
 * shorter period a longer one — even on a weekday the narrower one leaves out.
 */
export const rangesOn = (
	rules: AvailabilityRule[],
	date: string,
	activity: Activity,
): MinuteRange[] => {
	const covering = rules.filter((rule) => covers(rule, date));
	if (covering.length === 0) return [];

	const narrowest = Math.min(...covering.map(span));
	const weekday = dayjs(date).day() || 7;

	return covering
		.filter(
			(rule) =>
				span(rule) === narrowest &&
				rule.weekdays.includes(weekday) &&
				(activity === "checkpoints"
					? rule.forCheckpoints
					: rule.forConsultations),
		)
		.flatMap((rule) => rule.ranges);
};

/** Whether new checkpoints may be booked with this advisor at all. */
export const takesCheckpoints = (
	availability: Pick<Availability, "status" | "confirmedAt">,
	now = new Date(),
) =>
	availability.status !== AdvisorAvailabilityStatus.ConsultationsOnly &&
	!!availability.confirmedAt &&
	dayjs(now).diff(availability.confirmedAt, "day") <= AVAILABILITY_STALE_DAYS;

/** `HH:mm` of minutes from midnight. */
export const clock = (minute: number) =>
	`${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;

const local = (date: string, minute: number, zone: string) =>
	dayjs.tz(`${date} ${clock(minute)}`, zone);

const minuteOf = (at: Dayjs) => at.hour() * 60 + at.minute();

/** Whether a call at `minute` sits wholly inside one of the ranges. */
const fits = (ranges: MinuteRange[], minute: number) =>
	ranges.some(
		(range) => minute >= range.from && minute + SESSION_MINUTES <= range.to,
	);

const overlaps = (start: Dayjs, busy: Busy[]) => {
	const end = start.add(SESSION_MINUTES, "minute");
	return busy.some(
		(item) => start.isBefore(item.end) && end.isAfter(item.start),
	);
};

/** Every hour a call fits in the advisor's checkpoint hours on one of their days. */
function* hourlyStarts(availability: Availability, date: string) {
	for (const range of rangesOn(availability.rules, date, "checkpoints")) {
		for (
			let minute = Math.ceil(range.from / 60) * 60;
			minute + SESSION_MINUTES <= range.to;
			minute += 60
		) {
			yield { minute, at: local(date, minute, availability.timeZone) };
		}
	}
}

/**
 * The five calls a first call at `minute` on `date` books: the same local hour,
 * a week apart. Each must sit inside hours open for checkpoints, after any
 * away-until date, and clear of everything already booked.
 */
const seriesFrom = (
	availability: Availability,
	date: string,
	minute: number,
	busy: Busy[],
): Dayjs[] | null => {
	const calls: Dayjs[] = [];

	for (let index = 0; index < SESSIONS_PER_CHECKPOINT; index += 1) {
		const day = dayjs(date)
			.add(index * SPRINT_DAYS, "day")
			.format("YYYY-MM-DD");
		if (!fits(rangesOn(availability.rules, day, "checkpoints"), minute))
			return null;

		const at = local(day, minute, availability.timeZone);
		if (availability.awayUntil && at.isBefore(availability.awayUntil))
			return null;
		if (overlaps(at, busy)) return null;

		calls.push(at);
	}

	return calls;
};

/** The series a first call at exactly `first` books; null when it is not free. */
export const seriesAt = (
	availability: Availability,
	first: Date,
	busy: Busy[],
): Dayjs[] | null => {
	const at = dayjs(first).tz(availability.timeZone);
	const calls = seriesFrom(
		availability,
		at.format("YYYY-MM-DD"),
		minuteOf(at),
		busy,
	);

	return calls && at.isSame(calls[0]) ? calls : null;
};

/** The last day anything can be offered: the end of the last period, or a year out. */
const horizon = (availability: Availability, now: Date) => {
	const cap = dayjs(now).add(AVAILABILITY_SEARCH_DAYS, "day");
	if (availability.rules.some((rule) => !rule.monthTo)) return cap;

	const last = availability.rules
		.map((rule) => dayjs(rule.monthTo))
		.reduce<Dayjs | null>(
			(max, day) => (!max || day.isAfter(max) ? day : max),
			null,
		);

	return last?.isBefore(cap) ? last : cap;
};

/**
 * Every first call that opens a free series between two dates (inclusive, in
 * the advisor's zone), on the hour. Nothing before `FIRST_CALL_MIN_DAYS` from
 * now, and nothing at all for an advisor not taking checkpoints.
 */
export const freeFirstCalls = (
	availability: Availability,
	busy: Busy[],
	from: string,
	to: string,
	now = new Date(),
): Date[] => {
	if (!takesCheckpoints(availability, now)) return [];

	const earliest = dayjs(now).add(FIRST_CALL_MIN_DAYS, "day");
	const end = horizon(availability, now);
	const starts: Date[] = [];

	for (
		let day = dayjs(from);
		!day.isAfter(to, "day") && !day.isAfter(end, "day");
		day = day.add(1, "day")
	) {
		const date = day.format("YYYY-MM-DD");

		for (const { minute, at } of hourlyStarts(availability, date)) {
			if (at.isBefore(earliest)) continue;
			if (seriesFrom(availability, date, minute, busy))
				starts.push(at.toDate());
		}
	}

	return starts.sort((a, b) => a.getTime() - b.getTime());
};

/**
 * Single calls free between two instants, on the hour: inside hours open for
 * checkpoints, after any away-until date, clear of everything booked. Where a
 * booked call may be moved to.
 */
export const freeCallsBetween = (
	availability: Availability,
	busy: Busy[],
	from: Date,
	to: Date,
): Date[] => {
	const starts: Date[] = [];

	for (
		let day = dayjs(from).tz(availability.timeZone).startOf("day");
		day.isBefore(to);
		day = day.add(1, "day")
	) {
		for (const { at } of hourlyStarts(availability, day.format("YYYY-MM-DD"))) {
			if (at.isBefore(from) || !at.isBefore(to)) continue;
			if (availability.awayUntil && at.isBefore(availability.awayUntil))
				continue;
			if (!overlaps(at, busy)) starts.push(at.toDate());
		}
	}

	return starts.sort((a, b) => a.getTime() - b.getTime());
};

/** The first free series, looked for a fortnight at a time; null when there is none. */
export const earliestFirstCall = (
	availability: Availability,
	busy: Busy[],
	now = new Date(),
): Date | null => {
	if (!takesCheckpoints(availability, now)) return null;

	const end = horizon(availability, now);
	let from = dayjs(now).tz(availability.timeZone).startOf("day");

	while (!from.isAfter(end, "day")) {
		const to = from.add(13, "day");
		const found = freeFirstCalls(
			availability,
			busy,
			from.format("YYYY-MM-DD"),
			to.format("YYYY-MM-DD"),
			now,
		);
		if (found.length > 0) return found[0];
		from = to.add(1, "day");
	}

	return null;
};

/**
 * Booked checkpoint calls the new hours would leave out. A checkpoint is an
 * agreement between people: such a change waits until each call is moved.
 */
export const callsOutside = (
	rules: AvailabilityRule[],
	timeZone: string,
	calls: { id: string; scheduledAt: Date }[],
) =>
	calls.filter((call) => {
		const at = dayjs(call.scheduledAt).tz(timeZone);

		return !fits(
			rangesOn(rules, at.format("YYYY-MM-DD"), "checkpoints"),
			minuteOf(at),
		);
	});
