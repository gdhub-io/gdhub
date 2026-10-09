import { describe, expect, it } from "vitest";
import { buildIcs } from "../src/lib/calendar";

const NOW = new Date("2026-10-09T12:00:00Z");

describe("buildIcs", () => {
	it("writes a timed event that lasts the given minutes, in UTC", () => {
		const ics = buildIcs(
			{
				uid: "s1@gdhub",
				title: "Session with Wilfred",
				start: new Date("2026-10-16T14:00:00Z"),
				minutes: 45,
			},
			NOW,
		);

		expect(ics).toContain("DTSTART:20261016T140000Z");
		expect(ics).toContain("DTEND:20261016T144500Z");
		expect(ics.split("\r\n")[0]).toBe("BEGIN:VCALENDAR");
	});

	it("writes an all-day event when the hour is not known", () => {
		const ics = buildIcs(
			{
				uid: "s1@gdhub",
				title: "Session",
				start: new Date("2026-10-31T00:00:00Z"),
				allDay: true,
			},
			NOW,
		);

		expect(ics).toContain("DTSTART;VALUE=DATE:20261031");
		expect(ics).toContain("DTEND;VALUE=DATE:20261101");
	});

	it("escapes what would break a line", () => {
		const ics = buildIcs(
			{
				uid: "u",
				title: "Project 2, #1; call\u200C\u200D",
				start: NOW,
				description: "line one\nline two",
			},
			NOW,
		);

		expect(ics).toContain("SUMMARY:Project 2\\, #1\\; call\r\n");
		expect(ics).toContain("DESCRIPTION:line one\\nline two");
	});
});
