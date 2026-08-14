import { describe, expect, it } from "vitest";
import { nextFreeSlug, toSlug } from "../src/helpers/slug";

describe("toSlug", () => {
	it("slugifies a name", () => {
		expect(toSlug("My Second Game", "project")).toBe("my-second-game");
	});

	it("transliterates non-latin names", () => {
		expect(toSlug("Моя Игра", "project")).toBe("moya-igra");
	});

	it("falls back when nothing slugifiable is left", () => {
		expect(toSlug("🎮🎮🎮", "project")).toBe("project");
	});
});

describe("nextFreeSlug", () => {
	it("keeps the base slug when it is free", () => {
		expect(nextFreeSlug("my-game", ["other-game"])).toBe("my-game");
	});

	it("starts numbering at 2", () => {
		expect(nextFreeSlug("my-game", ["my-game"])).toBe("my-game-2");
	});

	it("skips the numbers already in use", () => {
		expect(
			nextFreeSlug("my-game", ["my-game", "my-game-2", "my-game-3"]),
		).toBe("my-game-4");
	});

	it("ignores slugs that only share the prefix", () => {
		expect(nextFreeSlug("my-game", ["my-game-remastered"])).toBe("my-game");
	});

	it("stays unique across a hundred identical names", () => {
		const taken: string[] = [];
		for (let i = 0; i < 100; i++) taken.push(nextFreeSlug("my-game", taken));

		expect(new Set(taken).size).toBe(100);
		expect(taken.at(-1)).toBe("my-game-100");
	});
});
