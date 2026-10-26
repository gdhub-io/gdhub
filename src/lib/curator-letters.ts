import { sessionDay } from "@/lib/checkpoint-sessions";
import type { JournalEntry } from "@/services/checkpoint-curator/prompts/card";
import type { CuratorReview } from "@/types/checkpoints";

/**
 * The AI curator's letters the team has read, oldest first, for the next one
 * to continue: day 1's first letter and its check, then one a review. Only
 * sessions before `before` count; a pro curator's call notes carry no letter.
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
			return content.firstLetter && content.firstLetter !== content.message
				? [
						{ day, text: content.firstLetter },
						{ day, text: content.message },
					]
				: [{ day, text: content.message }];
		});
