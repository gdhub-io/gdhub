import { sessionDay } from "@/lib/checkpoints/days";
import type { JournalEntry } from "@/types/checkpoint-curator";
import type { CuratorReview } from "@/types/checkpoints";

/**
 * The AI curator's letters the team has read, oldest first, for the next one
 * to continue: day 1's first letter, its check and the plan's letter, then
 * one a review. Only sessions before `before` count; a pro curator's call
 * notes carry no letter.
 */
export const lettersSoFar = (
	sessions: { index: number; content: unknown }[],
	before = Number.POSITIVE_INFINITY,
): JournalEntry[] =>
	sessions
		.filter((session) => session.index < before)
		.sort((a, b) => a.index - b.index)
		.flatMap((session) => {
			const content = session.content as CuratorReview | null;
			if (!content?.message) return [];
			const day = sessionDay(session.index);
			return [
				content.firstLetter !== content.message && content.firstLetter,
				content.message,
				content.planLetter,
			]
				.filter((text): text is string => !!text)
				.map((text) => ({ day, text }));
		});
