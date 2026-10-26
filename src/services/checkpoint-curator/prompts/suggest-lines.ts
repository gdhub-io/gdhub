import { stripIndents } from "common-tags";
import type { SuggestLinesInput } from "../types";
import { CURATOR_STANCE, localeLine, renderWorkflow } from "./card";

/**
 * The fifth ask, and the only one the author presses: lines for one side of the
 * goal card, for someone who does not know what to write.
 *
 * It suggests, it never writes. Nothing here is stored and nothing lands on the
 * card by itself — the lines arrive in the form and the author keeps, edits or
 * deletes each one, which is the whole difference between help and a card
 * somebody else wrote.
 */

export const SUGGEST_LINES_FUNCTION_NAME = "report_suggested_lines";

export const suggestLinesSchema = (input: SuggestLinesInput) => ({
	type: "object",
	properties: {
		lines: {
			type: "array",
			minItems: 3,
			maxItems: 6,
			description:
				input.kind === "Outcome"
					? "Lines for what will exist by day 28, each one a single thing someone else could check."
					: "Lines for what the project already has today, each one a single thing that exists now.",
			items: {
				type: "string",
				description:
					"One line, under 15 words. No number, no bullet, no dash at the start — the form draws the list.",
			},
		},
	},
	required: ["lines"],
});

const renderAsk = (input: SuggestLinesInput) =>
	input.kind === "Outcome"
		? stripIndents`
			Goal: ${input.goal || "(not written yet)"}

			What the project has today:
			${input.inputs.map((text) => `- ${text}`).join("\n") || "- (nothing listed)"}

			${renderWorkflow(input.workflow)}
		`
		: stripIndents`
			Project: ${input.project.name}
			${input.project.description || "(no description)"}

			${renderWorkflow(input.workflow)}

			What the previous checkpoint owed by its day 28:
			${input.previousOutcomes.map((text) => `- ${text}`).join("\n") || "- (there was no previous checkpoint)"}
		`;

export const suggestLinesMessages = (
	input: SuggestLinesInput,
	locale = "en",
) => [
	{
		role: "system" as const,
		content: stripIndents`
			${CURATOR_STANCE}

			The author is looking at an empty list and does not know what to write.
			Propose between three and six lines they can take, edit or throw away —
			each one thing, in their own words and about their own project, concrete
			enough that someone else could tell whether it exists.

			${
				input.kind === "Outcome"
					? "These are outcomes: what will exist by day 28 that does not exist today. Something a small team can finish in 28 days, and something an artifact could prove — not an activity, not a feeling, and never the whole game."
					: "These are inputs: what the project already has today, before the 28 days start. Claim only what the material below shows; where it shows little, propose the ordinary things a project at this stage has and keep them plain."
			}

			You are proposing wording, not scope. Do not rank the lines, do not say
			which matters most, and do not comment on the project or on what is
			missing from it — this call answers with lines and nothing else.

			${localeLine(locale)}
		`,
	},
	{
		role: "user" as const,
		content: stripIndents`
			${renderAsk(input)}

			Answer via the ${SUGGEST_LINES_FUNCTION_NAME} function.
		`,
	},
];
