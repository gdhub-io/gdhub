import { describe, expect, it } from "vitest";
import { checkpointPlan, dateOfDay } from "@/lib/checkpoint-plan";

// Calls on days 1, 8, 15, 22 and 28 and the verdict by day 30, as the standard
// has them; devlogs where `devlogDayOf` puts them, which is what reminds.
describe("the curator's plan", () => {
	const plan = checkpointPlan();

	it("puts a call at the start of each sprint and a fifth on day 28", () => {
		expect(
			plan.filter((step) => step.kind === "call").map((step) => step.day),
		).toEqual([1, 8, 15, 22, 28]);
	});

	it("has each devlog due before the call that follows it", () => {
		expect(
			plan.filter((step) => step.kind === "devlog").map((step) => step.day),
		).toEqual([6, 13, 20, 27]);
	});

	it("ends with the verdict on day 30", () => {
		expect(plan.at(-1)).toEqual({ kind: "verdict", day: 30 });
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
