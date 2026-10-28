import { describe, expect, it } from "vitest";
import {
	checkpointPathHref,
	pathTabOf,
	sessionOfSprintParam,
	sprintParam,
} from "@/lib/checkpoint-hrefs";

describe("Path to Checkpoint links", () => {
	it("names sprints 1–4 by number and the last session the verdict", () => {
		expect([1, 2, 3, 4, 5].map(sprintParam)).toEqual(["1", "2", "3", "4", "verdict"]);
		expect(checkpointPathHref("hollow-tide", 3, 2)).toBe(
			"/user/project/hollow-tide/workflow/cp3?sprint=2",
		);
		expect(checkpointPathHref("hollow-tide", 3)).toBe(
			"/user/project/hollow-tide/workflow/cp3",
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
		expect(checkpointPathHref("hollow-tide", 3, 2, "review")).toBe(
			"/user/project/hollow-tide/workflow/cp3?sprint=2&tab=review",
		);
		expect(checkpointPathHref("hollow-tide", 3, undefined, "plan")).toBe(
			"/user/project/hollow-tide/workflow/cp3?tab=plan",
		);
		expect(pathTabOf("review")).toBe("review");
		expect(pathTabOf("notes")).toBeUndefined();
	});
});
