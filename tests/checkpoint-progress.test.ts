import { describe, expect, it } from "vitest";
import { checkpointProgress } from "@/lib/checkpoints/days";

describe("checkpointProgress", () => {
	const start = new Date("2026-11-10T09:00:00.000Z");

	it("has no day and is not upcoming without a start", () => {
		expect(checkpointProgress(null)).toEqual({
			day: null,
			daysLeft: null,
			upcoming: false,
		});
	});

	it("is upcoming until the start's UTC day, still counted as day 1", () => {
		const eve = new Date("2026-11-09T23:59:00.000Z");
		expect(checkpointProgress(start, eve)).toEqual({
			day: 1,
			daysLeft: 27,
			upcoming: true,
		});
	});

	it("is not upcoming on the start's UTC day, before its hour", () => {
		const morning = new Date("2026-11-10T00:01:00.000Z");
		expect(checkpointProgress(start, morning).upcoming).toBe(false);
	});

	it("is not upcoming once under way", () => {
		const later = new Date("2026-11-20T12:00:00.000Z");
		expect(checkpointProgress(start, later)).toEqual({
			day: 11,
			daysLeft: 17,
			upcoming: false,
		});
	});
});
