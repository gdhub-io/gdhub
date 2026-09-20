import { stripIndents } from "common-tags";
import type { DevlogAnswerInput } from "../types";
import { CURATOR_STANCE, localeLine } from "./card";

/**
 * The answer under a devlog, written the day after it was posted (§8).
 *
 * It answers, it does not grade: what reads as progress, which outcomes the post
 * moves, which are still untouched — all of it checkable against the goal card.
 * The post stays whole above it and the author can ignore it.
 */

export const DEVLOG_ANSWER_FUNCTION_NAME = "report_devlog_answer";

export const devlogAnswerSchema = (input: DevlogAnswerInput) => {
	const ids = input.outcomes.map((item) => item.id);

	return {
		type: "object",
		properties: {
			answer: {
				type: "string",
				description:
					"Two or three sentences under the post. Say what this moves and what it does not. No praise, no score, no advice about craft.",
			},
			moves: {
				type: "array",
				description: "Outcomes this post shows progress on. Often empty.",
				items: { type: "string", enum: ids },
			},
			untouched: {
				type: "array",
				description:
					"Outcomes no devlog has shown progress on yet, as far as this post says.",
				items: { type: "string", enum: ids },
			},
		},
		required: ["answer", "moves", "untouched"],
	};
};

export const devlogAnswerMessages = (
	input: DevlogAnswerInput,
	locale = "en",
) => [
	{
		role: "system" as const,
		content: stripIndents`
			${CURATOR_STANCE}

			You are answering one devlog. Only claim an outcome moved where the post
			actually says something about it — a post about refactoring the build
			pipeline moves nothing on the card, and saying otherwise teaches the
			author the answers are noise.

			${
				input.devlog.hasVideo
					? "The post carries a video you were not shown. Do not describe it or imply you watched it."
					: ""
			}

			${localeLine(locale)}
		`,
	},
	{
		role: "user" as const,
		content: stripIndents`
			Outcomes owed by day 28:
			${input.outcomes.map((item) => `- [${item.id}] ${item.text}`).join("\n") || "- (nothing listed)"}

			Devlog published ${input.devlog.publishedAt}:
			"""
			${input.devlog.content}
			"""

			Answer via the ${DEVLOG_ANSWER_FUNCTION_NAME} function.
		`,
	},
];
