import { generateText, Output } from "ai";
import { stripIndents } from "common-tags";
import { z } from "zod";
import { AI_MODELS } from "@/config/ai-models";
import { fenced } from "@/lib/checkpoints/curator-text";
import { aiModel } from "@/services/ai/model";
import { traceGenerated } from "@/services/ai-trace";
import { type AiMeter, recordAiUsage } from "@/services/ai-usage";
import type { JournalEntry } from "@/types/checkpoint-curator";
import {
	AUTHOR_VOICE,
	hintBlock,
	localeLine,
	PARTICIPANT_DATA,
	renderCharacter,
	renderJournal,
} from "./prompts/card";

export type PlanLetterInput = {
	character?: string | null;
	goal: string;
	tasks: string[];
	journal: JournalEntry[];
	/** When the curator looks again: the sprint 1 review, "Thursday 8 Oct". */
	reviewOn: string;
	/** An admin's note when the letter is regenerated (GDHUB-156). */
	hint?: string | null;
};

const letterSchema = z.object({
	message: z
		.string()
		.max(600)
		.describe("The letter, two to four short sentences"),
});

/**
 * Day 1 with the AI curator (GDHUB-117): the plan is approved, and the letter
 * the team reads for the whole first sprint says so — start on it, tell how it
 * goes in devlog posts, attach what proves a task done, and when the curator
 * looks again. In the character's voice, continuing the letters before it.
 */
export const composePlanLetter = async (
	input: PlanLetterInput,
	meter?: AiMeter,
	locale?: string,
): Promise<string | null> => {
	const request = {
		instructions: stripIndents`
			${renderCharacter(input.character, "route")}

			${AUTHOR_VOICE}

			${PARTICIPANT_DATA}

			The plan is approved: the route is laid and the team sets out. Write
			the short entry they will read for the whole first sprint. Say the
			plan is ready, so they start on it; ask them to tell you how it goes
			in devlog posts and to attach to each task the artifact that shows it
			done; say when you will look at what is new. No advice on the tasks —
			that was the check before. ${localeLine(locale)}
		`,
		prompt:
			stripIndents`
			${renderJournal(input.journal)}

			The goal: ${fenced(input.goal)}
			The tasks: ${input.tasks.map(fenced).join("; ")}
			You look at what is new on: ${input.reviewOn}
		` + hintBlock(input.hint),
	};
	try {
		const started = Date.now();
		const result = await generateText({
			model: aiModel(AI_MODELS.curatorReview),
			output: Output.object({ schema: letterSchema, name: "letter" }),
			...request,
		});
		traceGenerated(
			"planLetter",
			AI_MODELS.curatorReview,
			started,
			request,
			result,
		);
		await recordAiUsage(meter, AI_MODELS.curatorReview, result.usage);
		return result.output?.message ?? null;
	} catch (error) {
		console.error("[checkpoint-curator] plan letter failed", error);
		return null;
	}
};
