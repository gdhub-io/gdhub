import dayjs from "dayjs";

type ScheduleLike = { startDate: string | Date; endDate: string | Date };

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
