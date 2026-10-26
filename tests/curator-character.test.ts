import { describe, expect, it } from "vitest";
import { characterFor } from "@/services/checkpoint-curator/prompts/card";

const persona = (settings: string[], genres: string[] = []) => ({
	settings,
	genres,
	levels: [],
});

describe("the AI curator's character", () => {
	it("comes from the author's first setting it knows, before any genre", () => {
		expect(characterFor(persona(["other", "Fantasy"], ["adventure"]))).toBe("wizard");
	});

	it("falls back to the first genre it knows", () => {
		expect(characterFor(persona(["real life"], ["dance", "adventure"]))).toBe("pirate");
	});

	it("is nobody in particular when the profile names nothing it knows", () => {
		expect(characterFor(persona(["other"], ["dance"]))).toBeNull();
		expect(characterFor(undefined)).toBeNull();
	});
});

describe("the character's voice", () => {
	it("is named and introduces itself; nothing improper whoever it is", async () => {
		const { renderCharacter } = await import(
			"@/services/checkpoint-curator/prompts/card"
		);
		const pirate = renderCharacter("pirate");
		expect(pirate).toContain("Captain Flint");
		expect(pirate).toContain("introduce yourself by name");
		expect(pirate).toContain("no swearing");
		// An unknown or missing key is the plain curator, never a broken prompt.
		expect(renderCharacter("dragon")).not.toContain("undefined");
		expect(renderCharacter(null)).toContain("AI curator");
	});
});
