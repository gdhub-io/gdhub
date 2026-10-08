import { describe, expect, it } from "vitest";
import { activeDaysByUser } from "@/lib/checkpoint-activity";

const start = new Date("2026-10-08T00:00:00.000Z");

describe("activeDaysByUser", () => {
	it("counts each checkpoint day once per person, in order", () => {
		const days = activeDaysByUser(start, [
			{ userId: "a", at: new Date("2026-10-10T18:00:00.000Z") },
			{ userId: "a", at: new Date("2026-10-08T09:00:00.000Z") },
			{ userId: "a", at: new Date("2026-10-10T08:00:00.000Z") },
			{ userId: "b", at: new Date("2026-10-14T23:59:00.000Z") },
		]);

		expect(days.get("a")).toEqual([1, 3]);
		expect(days.get("b")).toEqual([7]);
	});

	it("leaves out what happened before day one or after day 28", () => {
		const days = activeDaysByUser(start, [
			{ userId: "a", at: new Date("2026-10-07T23:00:00.000Z") },
			{ userId: "a", at: new Date("2026-11-05T00:00:00.000Z") },
			{ userId: "a", at: new Date("2026-11-04T12:00:00.000Z") },
		]);

		expect(days.get("a")).toEqual([28]);
	});
});
