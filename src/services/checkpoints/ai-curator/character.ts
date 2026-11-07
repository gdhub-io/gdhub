import { stripIndents } from "common-tags";
import { z } from "zod";
import { CHECKPOINT_DAYS } from "@/config/checkpoint";
import {
	CURATOR_CHARACTERS,
	characterFor,
} from "@/lib/checkpoints/curator-characters";
import type { AiMeter } from "@/services/ai-usage";
import { runStructured } from "@/services/checkpoints/ai-review";
import type { CuratorPersona } from "@/types/checkpoint-curator";

export const sheetSchema = z.object({
	name: z
		.string()
		.max(40)
		.describe("A short invented name with a title, as in the base role"),
	nameRu: z
		.string()
		.max(40)
		.describe(
			"The same name in Russian: the title translated, the name itself transliterated, never translated word by word",
		),
	who: z
		.string()
		.max(200)
		.describe("Who the character is, in one line, as the base role says it"),
	world: z
		.string()
		.max(240)
		.describe("Images from the character's world, a comma-separated list"),
	road: z
		.string()
		.max(280)
		.describe(
			"The journey from point A to point B in that world, and its dangers",
		),
});

/**
 * The character the AI curator plays on one checkpoint (GDHUB-117): one of
 * the tested roles, picked from the author's profile, made their own — a name
 * of its own and the author's other likes mixed into its world. Stored on the
 * checkpoint as JSON; the bare role's key when the model gives nothing usable,
 * null when the profile names nothing a role answers to.
 */
export const createCharacter = async (
	persona: CuratorPersona,
	meter?: AiMeter,
): Promise<string | null> => {
	const key = characterFor(persona);
	if (!key) return null;
	const base = CURATOR_CHARACTERS[key];

	const request = {
		instructions: stripIndents`
			You give a guide character its own identity for one game developer. It
			will lead their team through ${CHECKPOINT_DAYS} days of work as a guide leads travellers
			through its world.

			Keep the base role: who it is and that it has walked such roads before.
			Mix in the developer's other likes where they fit, lightly — one or two
			touches, never a crowd of them. Invent a short name with a title, as the
			base has one. Never a real person, a brand, or a known character from a
			game, a film or a book. Family-friendly and respectful.
		`,
		prompt: stripIndents`
			Base role: ${base.name}, ${base.who}.
			Its world: ${base.world}.
			Its road: ${base.road}.

			The developer likes — settings: ${persona.settings.join(", ") || "none"};
			genres: ${persona.genres.join(", ") || "none"}; kinds of game:
			${persona.levels.join(", ") || "none"}.
		`,
	};
	try {
		const sheet = await runStructured("character", sheetSchema, request, meter);
		return sheet ? JSON.stringify({ role: key, ...sheet }) : key;
	} catch (error) {
		console.error("[checkpoint-curator] character failed", error);
		return key;
	}
};
