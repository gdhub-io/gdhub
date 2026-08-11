import dayjs from "dayjs";

type ScheduleLike = { startDate: string | Date; endDate: string | Date };

/**
 * Which events get the billing.
 *
 * Conferences and game labs are the ones people travel for: they lead with a
 * full-bleed cover, on the page and on the share card alike. A meetup, workshop
 * or jam is a smaller promise and gets the split card. The rule lives here
 * because the page and the OG image both ask it, and answering it twice is how
 * a jam ends up shared as a conference.
 */
export function isHeadlineEvent(type: string | null | undefined) {
	return ["conference", "gamelab"].includes((type ?? "").toLowerCase());
}

/**
 * The two ends of a session, as a row shows them.
 *
 * A slot that finishes on another day has to say so. Printing bare clock times
 * made "11 Aug 09:00 → 15 Aug 20:00" read as `09:00 — 20:00`: a morning
 * workshop rather than the five days it actually runs. Same-day slots keep the
 * bare times, which is the common case and the quieter one.
 */
export function formatSlotTime(
	start: string | Date,
	end: string | Date,
	locale = "en",
) {
	const from = dayjs(start).locale(locale);
	const to = dayjs(end).locale(locale);

	return {
		start: from.format("HH:mm"),
		end: to.format("HH:mm"),
		spansDays: !from.isSame(to, "day"),
	};
}

/**
 * The heading over a day's sessions.
 *
 * A slot that runs past midnight has to say so somewhere, and the heading is
 * the honest place: the times below stay bare clock times, which is what they
 * are. One day reads "Thursday, 12 March"; a run of them collapses to
 * "11–15 August", because the weekday of the first morning stops meaning
 * anything once the block covers five of them.
 */
export function formatScheduleDay(
	day: string | Date,
	lastEnd: string | Date,
	locale = "en",
) {
	const from = dayjs(day).locale(locale);
	const to = dayjs(lastEnd).locale(locale);

	if (from.isSame(to, "day")) return from.format("dddd, D MMMM");
	if (from.isSame(to, "month")) {
		return `${from.format("D")}–${to.format("D MMMM")}`;
	}
	return `${from.format("D MMMM")} – ${to.format("D MMMM")}`;
}

/**
 * The calendar chip over a card's cover: a day line and a month line.
 *
 * A single day is `11 / AUG`. A run of days keeps one month line and joins the
 * numbers — `11-17 / AUG` — and only when the run crosses a month boundary does
 * the month line double up: `25-7 / AUG-SEP`. Printing just the first day made a
 * week-long conference look like a one-evening meetup.
 */
export function formatDateChip(
	start: string | Date,
	end: string | Date,
	locale = "en",
) {
	const from = dayjs(start).locale(locale);
	const to = dayjs(end).locale(locale);

	const month = (value: dayjs.Dayjs) => value.format("MMM").toUpperCase();

	if (from.isSame(to, "day")) {
		return { day: from.format("D"), month: month(from) };
	}

	return {
		day: `${from.format("D")}-${to.format("D")}`,
		month: from.isSame(to, "month")
			? month(from)
			: `${month(from)}-${month(to)}`,
	};
}

/**
 * Has the event finished?
 *
 * The last item's end is what ends an event, not the first one's — a three-day
 * conference was closing its registration on the evening of day one, because
 * the check read `schedule[0]`. Items arrive ordered by `startDate`, but a
 * short talk can be scheduled inside a long one, so the latest end is taken
 * across all of them rather than from the last row.
 *
 * An event with no schedule has no end to be past, so it stays open.
 */
export function hasEventEnded(schedule: ScheduleLike[] | null | undefined) {
	if (!schedule?.length) return false;

	const lastEnd = schedule.reduce<number>(
		(latest, item) => Math.max(latest, dayjs(item.endDate).valueOf()),
		0,
	);

	return Number.isFinite(lastEnd) && dayjs().isAfter(lastEnd);
}
