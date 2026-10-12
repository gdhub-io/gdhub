import { describe, expect, it } from "vitest";
import { SPRINTS_PER_CHECKPOINT } from "@/config/checkpoint";
import { currentSprint, devlogDayOf, sprintDayRange, sprintOfDate, sprintOfDay, sprintRange } from "@/lib/checkpoint-sprints";

/** A Tuesday, so nothing here can accidentally agree with a calendar week. */
const started = new Date("2026-09-01T09:30:00.000Z");
const at = (iso: string) => new Date(iso);

describe("sprintOfDay", () => {
	it("cuts the 28 days into four sevens", () => {
		expect([1, 7].map(sprintOfDay)).toEqual([1, 1]);
		expect([8, 14].map(sprintOfDay)).toEqual([2, 2]);
		expect([15, 21].map(sprintOfDay)).toEqual([3, 3]);
		expect([22, 28].map(sprintOfDay)).toEqual([4, 4]);
	});

	it("clamps either end rather than returning a fifth sprint", () => {
		expect(sprintOfDay(0)).toBe(1);
		expect(sprintOfDay(29)).toBe(SPRINTS_PER_CHECKPOINT);
	});
});

describe("sprintDayRange and devlogDayOf", () => {
	it("gives each sprint its day numbers", () => {
		expect(sprintDayRange(2)).toEqual({ firstDay: 8, lastDay: 14 });
		expect(sprintDayRange(4)).toEqual({ firstDay: 22, lastDay: 28 });
	});

	it("puts the devlog on the last day of the sprint", () => {
		expect([1, 2, 3, 4].map(devlogDayOf)).toEqual([7, 14, 21, 28]);
	});
});

describe("sprintRange", () => {
	it("starts on the day the checkpoint started, not on a Monday", () => {
		const first = sprintRange(started, 1);

		expect(first.from.toISOString()).toBe("2026-09-01T00:00:00.000Z");
		expect(first.to.toISOString()).toBe("2026-09-07T00:00:00.000Z");
	});

	it("runs the last sprint to the checkpoint's own day", () => {
		expect(sprintRange(started, 4).to.toISOString()).toBe(
			"2026-09-28T00:00:00.000Z",
		);
	});
});

describe("sprintOfDate", () => {
	it("files a devlog by the day it landed on", () => {
		expect(sprintOfDate(started, at("2026-09-06T18:00:00.000Z"))).toBe(1);
		expect(sprintOfDate(started, at("2026-09-08T00:05:00.000Z"))).toBe(2);
		expect(sprintOfDate(started, at("2026-09-28T23:59:00.000Z"))).toBe(4);
	});

	it("counts from midnight, so the small hours of day 2 are still sprint 1", () => {
		const lateStart = new Date("2026-09-01T23:50:00.000Z");

		expect(sprintOfDate(lateStart, at("2026-09-02T00:10:00.000Z"))).toBe(1);
	});

	it("returns null outside the 28 days instead of a nearest sprint", () => {
		expect(sprintOfDate(started, at("2026-08-30T12:00:00.000Z"))).toBeNull();
		expect(sprintOfDate(started, at("2026-09-29T00:00:00.000Z"))).toBeNull();
	});
});

describe("currentSprint", () => {
	it("follows the calendar while the checkpoint runs", () => {
		expect(currentSprint(started, at("2026-09-01T10:00:00.000Z"))).toBe(1);
		expect(currentSprint(started, at("2026-09-14T10:00:00.000Z"))).toBe(2);
	});

	it("stays on the last sprint once the days are gone", () => {
		expect(currentSprint(started, at("2026-10-20T10:00:00.000Z"))).toBe(4);
	});
});
