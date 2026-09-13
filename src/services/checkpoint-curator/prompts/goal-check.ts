import { stripIndents } from "common-tags";
import type { GoalCheckInput } from "../types";
import { CURATOR_STANCE, localeLine, renderCard, renderStage } from "./card";

/**
 * Day 1, consultation 1: is this reachable in 28 days (§6).
 *
 * The card is a draft. Someone with no shipped project writes "a finished game"
 * into the outcome list, and 28 days later fails at something that was never 28
 * days of work. This call is what stops that — by naming what does not fit and
 * offering a smaller version of each, never by rewriting the list.
 */

export const GOAL_CHECK_FUNCTION_NAME = "report_goal_check";

export const goalCheckSchema = (input: GoalCheckInput) => ({
	type: "object",
	properties: {
		reachable: {
			type: "boolean",
			description:
				"true if this outcome list is plausible for a small team in 28 days",
		},
		concerns: {
			type: "array",
			description:
				"At most one entry per outcome, and only where there is one.",
			items: {
				type: "object",
				properties: {
					itemId: {
						type: "string",
						enum: input.card.outcomes.map((item) => item.id),
					},
					kind: {
						type: "string",
						enum: ["too_big", "no_input", "unclear"],
						description:
							"too_big: several outcomes' worth of work. no_input: nothing on the day-1 list to build it from. unclear: nothing here says how anyone would know it exists.",
					},
					smaller: {
						type: "string",
						description:
							"A smaller version of this line the author may take or ignore. Omit where the concern is not about size.",
					},
				},
				required: ["itemId", "kind"],
			},
		},
		missing: {
			type: "array",
			description:
				"Outcomes the stage requires that this card does not promise. Empty where there are none.",
			items: { type: "string" },
		},
		note: {
			type: "string",
			description:
				"One short paragraph the author reads. Say what stands out; do not repeat the list back.",
		},
	},
	required: ["reachable", "concerns", "missing", "note"],
});

export const goalCheckMessages = (input: GoalCheckInput, locale = "en") => [
	{
		role: "system" as const,
		content: stripIndents`
			${CURATOR_STANCE}

			This is day 1. The card is still a draft and the author can change it.
			Judge only whether it fits 28 days of work for a small indie team, and
			whether the stage's own requirements are covered.

			An outcome is "unclear" when nothing about it says what would prove it
			exists at the end. An outcome with "no_input" has nothing on the day-1
			list to build from — say so, do not assume they will start it from
			scratch and still finish.

			${localeLine(locale)}
		`,
	},
	{
		role: "user" as const,
		content: stripIndents`
			${renderCard(input.card)}

			${renderStage(input.stage)}

			Answer via the ${GOAL_CHECK_FUNCTION_NAME} function.
		`,
	},
];
