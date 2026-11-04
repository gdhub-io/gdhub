import { describe, expect, it } from "vitest";
import {
	checkpointPathHref,
	pathTabOf,
	sessionOfSprintParam,
	sprintParam,
} from "@/lib/checkpoints/hrefs";

describe("Path to Checkpoint links", () => {
	it("names sprints 1–4 by number and the last session the verdict", () => {
		expect([1, 2, 3, 4, 5].map(sprintParam)).toEqual(["1", "2", "3", "4", "verdict"]);
		expect(checkpointPathHref("e2e-test-game", 3, 2)).toBe(
			"/user/project/e2e-test-game/workflow/cp3?sprint=2",
		);
		expect(checkpointPathHref("e2e-test-game", 3)).toBe(
			"/user/project/e2e-test-game/workflow/cp3",
		);
	});

	it("reads them back, and nothing it does not know", () => {
		expect(sessionOfSprintParam("verdict")).toBe(5);
		expect(sessionOfSprintParam("3")).toBe(3);
		expect(sessionOfSprintParam("5")).toBeUndefined();
		expect(sessionOfSprintParam("x")).toBeUndefined();
		expect(sessionOfSprintParam(undefined)).toBeUndefined();
	});

	it("adds the tab, alone or after the sprint", () => {
		expect(checkpointPathHref("e2e-test-game", 3, 2, "review")).toBe(
			"/user/project/e2e-test-game/workflow/cp3?sprint=2&tab=review",
		);
		expect(checkpointPathHref("e2e-test-game", 3, undefined, "plan")).toBe(
			"/user/project/e2e-test-game/workflow/cp3?tab=plan",
		);
		expect(pathTabOf("review")).toBe("review");
		expect(pathTabOf("notes")).toBeUndefined();
	});
});
