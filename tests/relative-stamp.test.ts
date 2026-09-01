import { describe, expect, it } from "vitest";
import { relativeStamp } from "@/helpers/format";

const NOW = new Date("2026-09-01T12:00:00.000Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms);

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("relativeStamp", () => {
	it("calls anything under ten seconds 'now'", () => {
		expect(relativeStamp(NOW, NOW)).toEqual({ unit: "now" });
		expect(relativeStamp(ago(9 * SECOND), NOW)).toEqual({ unit: "now" });
	});

	it("counts seconds, then minutes, then hours", () => {
		expect(relativeStamp(ago(45 * SECOND), NOW)).toEqual({
			unit: "seconds",
			value: 45,
		});
		expect(relativeStamp(ago(5 * MINUTE), NOW)).toEqual({
			unit: "minutes",
			value: 5,
		});
		expect(relativeStamp(ago(15 * HOUR), NOW)).toEqual({
			unit: "hours",
			value: 15,
		});
	});

	it("rounds down rather than up — 119 minutes is still one hour", () => {
		expect(relativeStamp(ago(HOUR + 59 * MINUTE), NOW)).toEqual({
			unit: "hours",
			value: 1,
		});
	});

	it("switches to a date after a day, and adds the year only once it differs", () => {
		expect(relativeStamp(ago(DAY), NOW)).toEqual({
			unit: "date",
			sameYear: true,
		});
		expect(relativeStamp(new Date("2022-03-07T12:00:00.000Z"), NOW)).toEqual({
			unit: "date",
			sameYear: false,
		});
	});

	it("treats a clock-skewed future timestamp as now", () => {
		expect(relativeStamp(new Date(NOW.getTime() + HOUR), NOW)).toEqual({
			unit: "now",
		});
	});
});
