import { stripIndents } from "common-tags";
import { CHECKPOINT_DAYS } from "@/config/checkpoint";
import { devlogText } from "@/lib/curator-text";
import type { MidNoteInput } from "../types";
import { CURATOR_STANCE, localeLine, renderCard, renderPicture } from "./card";

/**
 * The day-15 note (§7).
 *
 * It lists the outcomes with nothing claimed against them, says how much of the
 * calendar is gone, and asks the author to decide. **It never names the cut.**
 * That judgement belongs to a human curator, and saying otherwise would sell the
 * AI curator as something it is not.
 *
 * Which outcomes are unclaimed is computed in code and handed in — it is a fact
 * about the artifacts on the card, not something to ask a model about.
 */

export const MID_NOTE_FUNCTION_NAME = "report_mid_note";

export const midNoteSchema = () => ({
	type: "object",
	properties: {
		note: {
			type: "string",
			description:
				"Under 120 words. Name the unclaimed outcomes, say how much of the calendar is gone, and ask the author to decide what to change.",
		},
	},
	required: ["note"],
});

export const midNoteMessages = (input: MidNoteInput, locale = "en") => [
	{
		role: "system" as const,
		content: stripIndents`
			${CURATOR_STANCE}

			This is the halfway note. Three things go in it and nothing else: the
			outcomes with nothing claimed against them, how much of the calendar is
			gone, and a question asking the author what they want to change.

			You must NOT say which outcome to cut, recommend cutting, rank the
			outcomes by risk, or predict whether they will finish. The author decides
			the scope; deciding it for them is what a human curator is paid for and
			you are not that. Do not soften this into advice.

			Do not add outcomes to the unclaimed list and do not remove any: the list
			below is what the platform can see, and you are wording it, not deciding
			it.

			${localeLine(locale)}
		`,
	},
	{
		role: "user" as const,
		content: stripIndents`
			Day ${input.day} of ${CHECKPOINT_DAYS}.

			${renderCard(input.card)}

			Outcomes with nothing claimed against them:
			${
				input.unproven
					.map(
						(item) =>
							`- ${item.text}${item.reason === "missing" ? "" : ` (evidence attached but ${item.reason})`}`,
					)
					.join("\n") || "- (none — everything owed has evidence attached)"
			}

			Devlogs so far:
			${
				input.devlogs
					.map((post) => `- ${post.publishedAt}: ${devlogText(post.content)}`)
					.join("\n") || "- (none)"
			}

			${renderPicture(input.picture)}

			Answer via the ${MID_NOTE_FUNCTION_NAME} function.
		`,
	},
];
