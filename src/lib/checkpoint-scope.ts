import { SCOPE_ANSWER_HOURS, SCOPE_SESSION } from "@/config/checkpoint";
import { CheckpointCuratorKind } from "@/config/prisma-enums";
import { MS_PER_HOUR, sessionDay } from "@/lib/checkpoint-days";
import { dateOfDay } from "@/lib/checkpoint-plan";

/**
 * The outcome list is revisited at the third session — the call (or the AI
 * review) that opens sprint 3 — and the author has a day after it to answer.
 * Browser-safe: the server refuses outside the window and the page hides the
 * action outside it, from the same arithmetic.
 */
const SCOPE_ANSWER_MS = SCOPE_ANSWER_HOURS * MS_PER_HOUR;

/** Day 15: the day the third session falls on. */
export const CHECKPOINT_SCOPE_DAY = sessionDay(SCOPE_SESSION);

type SessionTimes = {
	index: number;
	scheduledAt: Date | string;
	endedAt: Date | string | null;
};

// A window that has not opened yet: the AI curator's review is still being written.
const NOT_YET = new Date(8.64e15);

/**
 * When the scope may change: from the third session until a day after it ended.
 * A session not stored yet, or one that never ended, counts from its start —
 * at worst UTC midnight of day 15, which leaves the whole of that day. With the
 * AI curator the window opens once its review is written: a change without its
 * advice has nothing to go on.
 */
export const scopeWindow = (
	startedAt: Date | string,
	sessions: SessionTimes[] = [],
	curatorKind?: CheckpointCuratorKind,
) => {
	const third = sessions.find((session) => session.index === SCOPE_SESSION);
	if (curatorKind === CheckpointCuratorKind.AI) {
		if (!third?.endedAt) return { opens: NOT_YET, closes: NOT_YET };
		const written = new Date(third.endedAt);
		return {
			opens: written,
			closes: new Date(written.getTime() + SCOPE_ANSWER_MS),
		};
	}
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
	curatorKind?: CheckpointCuratorKind,
) => {
	const { opens, closes } = scopeWindow(startedAt, sessions, curatorKind);

	if (now < opens) return "early" as const;

	return now < closes ? ("open" as const) : ("closed" as const);
};
