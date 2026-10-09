import { CHECKPOINT_DAYS } from "@/schemas/checkpoint";
import { dayNumberOn, utcStartOfDay } from "./checkpoint-days";

/** Something a person did, and when: a devlog, an artifact, a pulse answered. */
export type ActivityEvent = { userId: string; at: Date };

/**
 * The checkpoint days each person did something on, ascending — the checks of
 * the team pulse (frame `kMsaL`). Anything before day one or after day 28 is
 * not part of this checkpoint.
 */
export const activeDaysByUser = (startedAt: Date, events: ActivityEvent[]) => {
	const days = new Map<string, Set<number>>();

	for (const { userId, at } of events) {
		if (utcStartOfDay(at) < utcStartOfDay(startedAt)) continue;
		const day = dayNumberOn(startedAt, at);
		if (day > CHECKPOINT_DAYS) continue;
		days.set(userId, (days.get(userId) ?? new Set()).add(day));
	}

	return new Map(
		[...days].map(([userId, set]) => [userId, [...set].sort((a, b) => a - b)]),
	);
};
