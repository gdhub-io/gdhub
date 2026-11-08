import { describe, expect, it } from "vitest";
import { gameScores } from "@/lib/scout/game-score";

describe("gameScores", () => {
	it("gives the best game on every metric 100 and an idle one 0", () => {
		expect(
			gameScores([
				{ activity: 40, applause: 12, views: 900 },
				{ activity: 0, applause: 0, views: 0 },
			]),
		).toEqual([100, 0]);
	});

	it("weighs activity over applause over views", () => {
		const [activity, applause, views] = gameScores([
			{ activity: 10, applause: 0, views: 0 },
			{ activity: 0, applause: 10, views: 0 },
			{ activity: 0, applause: 0, views: 10 },
		]);
		expect([activity, applause, views]).toEqual([50, 30, 20]);
	});

	it("log-scales, so one viral number does not flatten the rest", () => {
		const [, modest] = gameScores([
			{ activity: 0, applause: 0, views: 10_000 },
			{ activity: 0, applause: 0, views: 100 },
		]);
		expect(modest).toBe(10);
	});

	it("scores an empty set without dividing by zero", () => {
		expect(gameScores([{ activity: 0, applause: 0, views: 0 }])).toEqual([0]);
	});
});
