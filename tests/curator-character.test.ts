import { describe, expect, it } from "vitest";
import { characterFor } from "@/lib/checkpoints/curator-characters";

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
			"@/services/checkpoints/ai-curator/prompts/card"
		);
		const pirate = renderCharacter("pirate", "route", true);
		expect(pirate).toContain("Captain Flint");
		expect(pirate).toContain("introduce yourself by name");
		expect(renderCharacter("pirate", "corrected")).toContain(
			"do not introduce yourself again",
		);
		expect(pirate).toContain("no swearing");
		// An unknown or missing key is the plain curator, never a broken prompt.
		expect(renderCharacter("dragon")).not.toContain("undefined");
		expect(renderCharacter(null)).toContain("AI curator");
	});
});

describe("the road the sprints make", () => {
	it("lays the route, walks it, rethinks it, walks the corrected one and arrives", async () => {
		const { legOfSprint, renderCharacter } = await import(
			"@/services/checkpoints/ai-curator/prompts/card"
		);
		expect([1, 2, 3].map((sprint) => legOfSprint(sprint, false))).toEqual([
			"walk",
			"rethink",
			"corrected",
		]);
		expect(legOfSprint(4, true)).toBe("arrival");
		expect(renderCharacter("pirate", "rethink")).toContain("Look at the map with them");
		expect(renderCharacter("pirate")).toContain("Never call yourself an AI curator");
	});
});

describe("a character made the author's own", () => {
	it("is read back from the checkpoint; a broken one is the plain curator", async () => {
		const { renderCharacter } = await import(
			"@/services/checkpoints/ai-curator/prompts/card"
		);
		const sheet = JSON.stringify({
			name: "Captain Irma",
			nameRu: "капитан Ирма",
			who: "a pirate captain who has also sailed to the stars",
			world: "the ship, the stars",
			road: "a voyage to the treasure planet",
		});
		expect(renderCharacter(sheet, "walk")).toContain("Captain Irma");
		expect(renderCharacter(sheet, "walk")).toContain("treasure planet");
		expect(renderCharacter("{not json", "walk")).not.toContain("undefined");
	});
});

describe("the character's face on the pages", () => {
	it("is its own name and its role's avatar", async () => {
		const { characterFace } = await import(
			"@/lib/checkpoints/curator-characters"
		);
		expect(
			characterFace(
				JSON.stringify({
					role: "pirate",
					name: "Captain Irma",
					nameRu: "капитан Ирма",
					who: "a pirate captain",
					world: "the ship",
					road: "a voyage",
				}),
			),
		).toEqual({ name: "Captain Irma", avatar: "/curators/pirate.webp" });
		expect(characterFace("wizard")).toEqual({
			name: "Elder Aldric",
			avatar: "/curators/wizard.webp",
		});
		expect(characterFace(null)).toBeNull();
	});
});

describe("the avatars", () => {
	it("are there for every role", async () => {
		const { existsSync } = await import("node:fs");
		const { CURATOR_CHARACTERS } = await import(
			"@/lib/checkpoints/curator-characters"
		);
		const missing = Object.keys(CURATOR_CHARACTERS).filter(
			(role) => !existsSync(`public/curators/${role}.webp`),
		);
		expect(missing).toEqual([]);
	});
});
