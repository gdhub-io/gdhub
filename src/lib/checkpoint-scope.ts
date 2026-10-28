import { SCOPE_ANSWER_HOURS, SCOPE_SESSION } from "@/config/checkpoint";
import { sessionDay } from "@/lib/checkpoint-days";
import { dateOfDay } from "@/lib/checkpoint-plan";

/**
 * The outcome list is revisited at the third session — the call (or the AI
 * review) that opens sprint 3 — and the author has a day after it to answer.
 * Browser-safe: the server refuses outside the window and the page hides the
 * action outside it, from the same arithmetic.
 */
const SCOPE_ANSWER_MS = SCOPE_ANSWER_HOURS * 60 * 60 * 1000;

/** Day 15: the day the third session falls on. */
export const CHECKPOINT_SCOPE_DAY = sessionDay(SCOPE_SESSION);

type SessionTimes = {
	index: number;
	scheduledAt: Date | string;
	endedAt: Date | string | null;
};

/**
 * When the scope may change: from the third session until a day after it ended.
 * A session not stored yet, or one that never ended, counts from its start —
 * at worst UTC midnight of day 15, which leaves the whole of that day.
 */
export const scopeWindow = (
	startedAt: Date | string,
	sessions: SessionTimes[] = [],
) => {
	const third = sessions.find((session) => session.index === SCOPE_SESSION);
	const opens = new Date(
		third?.scheduledAt ?? dateOfDay(startedAt, CHECKPOINT_SCOPE_DAY),
	);
	const closes = new Date(
		new Date(third?.endedAt ?? opens).getTime() + SCOPE_ANSWER_MS,
	);

	return { opens, closes };
};

/** Where `now` stands against the window. */
export const scopeState = (
	startedAt: Date | string,
	sessions: SessionTimes[] = [],
	now = new Date(),
) => {
	const { opens, closes } = scopeWindow(startedAt, sessions);

	if (now < opens) return "early" as const;

	return now < closes ? ("open" as const) : ("closed" as const);
};
