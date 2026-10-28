import { describe, expect, it } from "vitest";
import {
	buildIcs,
	googleCalendarUrl,
	outlookCalendarUrl,
} from "../src/lib/calendar";

const call = {
	uid: "s1@gdhub",
	title: "Session with Wilfred",
	start: new Date("2026-10-16T14:00:00Z"),
	minutes: 45,
};

describe("buildIcs", () => {
	it("writes a timed event that lasts the given minutes, in UTC", () => {
		const ics = buildIcs([call]);
		expect(ics).toContain("DTSTART:20261016T140000Z");
		expect(ics).toContain("DURATION:PT45M");
		expect(ics.split("\r\n")[0]).toBe("BEGIN:VCALENDAR");
	});

	it("writes an all-day event when the hour is not known", () => {
		const ics = buildIcs([
			{
				uid: "d1",
				title: "Sprint 1 due",
				start: new Date("2026-10-31T00:00:00Z"),
				allDay: true,
			},
		]);
		expect(ics).toContain("DTSTART;VALUE=DATE:20261031");
		expect(ics).toContain("DTEND;VALUE=DATE:20261101");
	});

	it("puts many events in one named calendar and escapes what breaks a line", () => {
		const ics = buildIcs(
			[call, { ...call, uid: "u", title: "Project 2, #1; call‌‍" }],
			"Checkpoint 3",
		);
		expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
		expect(ics).toContain("X-WR-CALNAME:Checkpoint 3");
		expect(ics).toContain("SUMMARY:Project 2\\, #1\\; call\r\n");
	});
});

describe("calendar links", () => {
	it("opens the event in Google and in Outlook", () => {
		expect(googleCalendarUrl(call)).toContain("calendar.google.com");
		expect(googleCalendarUrl(call)).toContain("20261016T140000Z");
		expect(outlookCalendarUrl(call)).toContain("outlook.live.com");
	});
});
