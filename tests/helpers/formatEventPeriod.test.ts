import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { describe, expect, it } from "vitest";
import { formatEventPeriod } from "../../src/helpers/format";

dayjs.extend(utc);

describe("formatEventPeriod", () => {
	it("formats same-day period in day mode", () => {
		const start = dayjs("2030-01-15T10:00:00Z").toDate();
		const end = dayjs("2030-01-15T12:00:00Z").toDate();
		expect(formatEventPeriod(start, end, "en", "day")).toBe("Jan 15, 2030");
	});

	it("formats same-day period in daytime mode", () => {
		const start = dayjs("2030-01-15T10:00:00Z").toDate();
		const end = dayjs("2030-01-15T12:00:00Z").toDate();
		expect(formatEventPeriod(start, end, "en", "daytime")).toBe("Jan 15, 2030 10:00-12:00");
	});

	it("formats same-year period in day mode", () => {
		const start = dayjs("2030-06-10T10:00:00Z").toDate();
		const end = dayjs("2030-06-15T12:00:00Z").toDate();
		expect(formatEventPeriod(start, end, "en", "day")).toBe("10 - 15 Jun, 2030");
	});

	it("formats same-year period in daytime mode", () => {
		const start = dayjs("2030-06-10T10:00:00Z").toDate();
		const end = dayjs("2030-06-15T12:00:00Z").toDate();
		expect(formatEventPeriod(start, end, "en", "daytime")).toBe(
			"Jun 10 10:00 - Jun 15 12:00, 2030",
		);
	});

	it("formats cross-year period in day mode", () => {
		const start = dayjs("2030-12-31T10:00:00Z").toDate();
		const end = dayjs("2031-01-02T12:00:00Z").toDate();
		expect(formatEventPeriod(start, end, "en", "day")).toBe("Dec 31, 2030 - Jan 2, 2031");
	});

	it("formats cross-year period in daytime mode", () => {
		const start = dayjs("2030-12-31T10:00:00Z").toDate();
		const end = dayjs("2031-01-02T12:00:00Z").toDate();
		expect(formatEventPeriod(start, end, "en", "daytime")).toBe(
			"Dec 31, 2030 10:00 - Jan 2, 2031 12:00",
		);
	});
});
