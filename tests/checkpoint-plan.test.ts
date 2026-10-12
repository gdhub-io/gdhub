import { describe, expect, it } from "vitest";
import {
	authorNextStep,
	checkpointPlan,
	dateOfDay,
} from "@/lib/checkpoint-plan";

// Calls on days 1, 8, 15, 22 and 29 and the verdict by day 31, as the standard
// has them; devlogs where `devlogDayOf` puts them, which is what reminds.
describe("the curator's plan", () => {
	const plan = checkpointPlan();

	it("puts a call at the start of each sprint and a fifth on day 29", () => {
		expect(
			plan.filter((step) => step.kind === "call").map((step) => step.day),
		).toEqual([1, 8, 15, 22, 29]);
	});

	it("has each devlog due before the call that follows it", () => {
		expect(
			plan.filter((step) => step.kind === "devlog").map((step) => step.day),
		).toEqual([7, 14, 21, 28]);
	});

	it("ends with the verdict on day 31", () => {
		expect(plan.at(-1)).toEqual({ kind: "verdict", day: 31 });
	});

	it("is in day order", () => {
		const days = plan.map((step) => step.day);

		expect(days).toEqual([...days].sort((a, b) => a - b));
	});

	it("dates day 1 as the start, whatever hour it started at", () => {
		const start = "2026-09-28T23:50:00.000Z";

		expect(dateOfDay(start, 1).toISOString()).toBe("2026-09-28T00:00:00.000Z");
		expect(dateOfDay(start, 30).toISOString()).toBe(
			"2026-10-27T00:00:00.000Z",
		);
	});
});

// What the workflow widget tells the author to do, by day of the checkpoint.
describe("the author's next step", () => {
	const none = new Set<number>();

	it("is the opening call on day 1", () => {
		expect(authorNextStep(1, none)).toEqual({ kind: "call", call: 1, day: 1 });
	});

	it("is the sprint's devlog once the call has passed", () => {
		expect(authorNextStep(2, none)).toEqual({
			kind: "devlog",
			sprint: 1,
			day: 7,
			overdue: false,
		});
	});

	it("still asks for a late devlog until the next call, marked late", () => {
		expect(authorNextStep(8, none)).toMatchObject({
			kind: "devlog",
			sprint: 1,
			overdue: true,
		});
	});

	it("moves on to the call once the devlog is published", () => {
		expect(authorNextStep(7, new Set([1]))).toEqual({
			kind: "call",
			call: 2,
			day: 8,
		});
	});

	it("drops a devlog the call already went past", () => {
		expect(authorNextStep(9, none)).toMatchObject({ kind: "devlog", sprint: 2 });
	});

	it("leaves only the verdict after the last call", () => {
		expect(authorNextStep(30, new Set([1, 2, 3, 4]))).toEqual({
			kind: "verdict",
			day: 31,
		});
	});

	it("has nothing left once the verdict day has passed", () => {
		expect(authorNextStep(32, new Set([1, 2, 3, 4]))).toBeNull();
	});
});
