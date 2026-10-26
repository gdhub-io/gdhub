import { openai } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { z } from "zod";
import { AI_MODELS } from "@/config/ai-models";

/**
 * The lab's data in Russian, for Dmitry to read (GDHUB-117). Reading only: a
 * run always goes in English, as production does, and nothing here is metered
 * to a checkpoint or traced.
 *
 * Only prose is translated — a string with a space in it that is not a link.
 * Ids, enum values, models and URLs keep their exact form, so the JSON still
 * reads as the shape the call takes.
 */

const isProse = (value: string) =>
	/\s/.test(value.trim()) && !/^https?:\/\//.test(value);

const collect = (value: unknown, into: Set<string>) => {
	if (typeof value === "string") {
		if (isProse(value)) into.add(value);
	} else if (Array.isArray(value)) {
		for (const each of value) collect(each, into);
	} else if (value && typeof value === "object") {
		for (const each of Object.values(value)) collect(each, into);
	}
};

const replace = (value: unknown, by: Map<string, string>): unknown => {
	if (typeof value === "string") return by.get(value) ?? value;
	if (Array.isArray(value)) return value.map((each) => replace(each, by));
	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value).map(([key, each]) => [key, replace(each, by)]),
		);
	}
	return value;
};

const translationSchema = z.object({
	translations: z
		.array(z.string())
		.describe("Each text in Russian, in the order given, one for one."),
});

/** The same value with its prose in Russian; untouched when the model fails. */
export async function inRussian<T>(value: T): Promise<T> {
	const texts = new Set<string>();
	collect(value, texts);
	if (!texts.size) return value;

	const originals = [...texts];
	const { output } = await generateText({
		model: openai(AI_MODELS.curatorAssist),
		output: Output.object({ schema: translationSchema, name: "translations" }),
		instructions:
			"Translate each text into Russian for a reader checking an AI's work. Keep ids in square brackets, code, JSON, enum words like Matches or GoalMet, names and URLs exactly as they are. Keep line breaks.",
		prompt: JSON.stringify(originals),
	});
	if (output?.translations.length !== originals.length) return value;

	return replace(
		value,
		new Map(originals.map((text, index) => [text, output.translations[index]])),
	) as T;
}
