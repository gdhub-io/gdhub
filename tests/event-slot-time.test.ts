import { describe, expect, it } from "vitest";
import {
	formatScheduleDay,
	formatSlotTime,
	hasEventEnded,
} from "@/helpers/event";

describe("formatSlotTime", () => {
	it("prints bare clock times for a slot inside one day", () => {
		const slot = formatSlotTime(
			"2026-06-18T08:00:00.000Z",
			"2026-06-18T15:00:00.000Z",
		);
		expect(slot.spansDays).toBe(false);
		expect(slot.end).not.toMatch(/[A-Za-z]/);
	});

	/**
	 * The regression: a five-day programme was rendering as `09:00 — 20:00`,
	 * which reads as a morning workshop.
	 */
	it("flags a slot that finishes on another day", () => {
		const slot = formatSlotTime(
			"2026-08-11T06:00:00.000Z",
			"2026-08-15T17:00:00.000Z",
		);
		expect(slot.spansDays).toBe(true);
		// The times stay bare; the heading carries the span.
		expect(slot.end).not.toMatch(/[A-Za-z]/);
	});

	it("treats a slot ending just after midnight as spanning days", () => {
		const slot = formatSlotTime(
			"2026-03-12T20:00:00.000Z",
			"2026-03-13T01:00:00.000Z",
		);
		expect(slot.spansDays).toBe(true);
	});
});

describe("hasEventEnded", () => {
	it("uses the latest end, not the last row", () => {
		// A short talk scheduled inside a long one: the long one ends the event.
		expect(
			hasEventEnded([
				{ startDate: "2020-01-01T09:00:00Z", endDate: "2020-01-05T18:00:00Z" },
				{ startDate: "2020-01-02T09:00:00Z", endDate: "2020-01-02T10:00:00Z" },
			]),
		).toBe(true);
	});

	it("an event with no schedule has no end to be past", () => {
		expect(hasEventEnded([])).toBe(false);
		expect(hasEventEnded(null)).toBe(false);
	});
});

describe("formatScheduleDay", () => {
	it("names the weekday for a single day", () => {
		expect(
			formatScheduleDay("2026-03-12T09:00:00Z", "2026-03-12T18:00:00Z"),
		).toMatch(/^\w+, 12 March$/);
	});

	/** The regression: five days were reading as one morning. */
	it("collapses a run inside one month to a day range", () => {
		expect(
			formatScheduleDay("2026-08-11T06:00:00Z", "2026-08-15T17:00:00Z"),
		).toBe("11–15 August");
	});

	it("spells both months when the run crosses one", () => {
		expect(
			formatScheduleDay("2026-08-11T06:00:00Z", "2026-11-26T06:00:00Z"),
		).toBe("11 August – 26 November");
	});
});
