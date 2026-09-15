import { stripIndents } from "common-tags";
import type { GoalCheckInput } from "../types";
import {
	CURATOR_STANCE,
	localeLine,
	renderCard,
	renderStage,
	renderTeam,
} from "./card";

/**
 * Day 1, consultation 1: is this reachable in 28 days (§6).
 *
 * The card is a draft. Someone with no shipped project writes "a finished game"
 * into the outcome list, and 28 days later fails at something that was never 28
 * days of work. This call is what stops that — by naming what does not fit and
 * offering a smaller version of each, never by rewriting the list.
 *
 * "Does not fit" is measured against the team's own stated hours, which is the
 * one number that turns a scope opinion into an argument the author can check.
 */

export const GOAL_CHECK_FUNCTION_NAME = "report_goal_check";

export const goalCheckSchema = (input: GoalCheckInput) => ({
	type: "object",
	properties: {
		reachable: {
			type: "boolean",
			description:
				"true if this outcome list is plausible in 28 days for a team with the hours stated below",
		},
		notes: {
			type: "array",
			description:
				"At most one note per task, and only where there is something to say.",
			items: {
				type: "object",
				properties: {
					itemId: {
						type: "string",
						enum: input.card.outcomes.map((item) => item.id),
					},
					note: {
						type: "string",
						description:
							"One or two sentences about this task. Where it is several tasks' worth of work, say so and offer a smaller wording. Where nothing on the day-1 list builds towards it, say that. Where nothing about it would prove it exists at the end, say that.",
					},
				},
				required: ["itemId", "note"],
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
				"One short paragraph the author reads. Say what stands out; do not repeat the list back. Where the list outruns the hours the team has, say so and name those hours.",
		},
	},
	required: ["reachable", "notes", "missing", "note"],
});

export const goalCheckMessages = (input: GoalCheckInput, locale = "en") => [
	{
		role: "system" as const,
		content: stripIndents`
			${CURATOR_STANCE}

			This is day 1. The card is still a draft and the author can change it.
			Judge only whether it fits 28 days of work for this team, with the
			hours it has, and whether the stage's own requirements are covered.

			The hours are what the members themselves stated they have per week,
			summed and carried over the 28 days. Weigh the list against them and
			say plainly where the promise outruns the time, naming the hours it
			has — never a rate of work you made up, and never a task-by-task
			estimate in hours. Where nobody has stated their hours, say the time
			available is unknown and judge the list on its own; unknown hours are
			not zero hours, and must never make everything unreachable.

			The author reads you and then edits their own tasks, so write to be
			read rather than to be parsed. Offer a smaller wording where a task is
			several tasks' worth of work. Say plainly where nothing on the day-1
			list builds towards one — do not assume they will start it from scratch
			and still finish. Say where nothing about a task would prove it exists.

			${localeLine(locale)}
		`,
	},
	{
		role: "user" as const,
		content: stripIndents`
			${renderCard(input.card)}

			${renderStage(input.stage)}

			${renderTeam(input.team)}

			Answer via the ${GOAL_CHECK_FUNCTION_NAME} function.
		`,
	},
];
