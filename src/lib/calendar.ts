/**
 * One calendar event as an iCalendar file (RFC 5545), for "Add to calendar".
 * An event without a known hour is an all-day one on its date.
 */
export type CalendarEvent = {
	uid: string;
	title: string;
	start: Date;
	/** Minutes; ignored for an all-day event. */
	minutes?: number;
	allDay?: boolean;
	description?: string;
	url?: string;
};

const stamp = (date: Date) =>
	date
		.toISOString()
		.replace(/[-:]/g, "")
		.replace(/\.\d{3}/, "");

const day = (date: Date) => date.toISOString().slice(0, 10).replace(/-/g, "");

// Zero-width marks (Tolgee tags translated strings with them in development)
// would travel into the calendar's title.
const escapeText = (text: string) =>
	text
		.replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
		.replace(/\\/g, "\\\\")
		.replace(/\n/g, "\\n")
		.replace(/[,;]/g, "\\$&");

export function buildIcs(event: CalendarEvent, now = new Date()) {
	const when = event.allDay
		? [
				`DTSTART;VALUE=DATE:${day(event.start)}`,
				`DTEND;VALUE=DATE:${day(new Date(event.start.getTime() + 86_400_000))}`,
			]
		: [
				`DTSTART:${stamp(event.start)}`,
				`DTEND:${stamp(new Date(event.start.getTime() + (event.minutes ?? 60) * 60_000))}`,
			];

	return [
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		"PRODID:-//GDHub//Checkpoints//EN",
		"BEGIN:VEVENT",
		`UID:${event.uid}`,
		`DTSTAMP:${stamp(now)}`,
		...when,
		`SUMMARY:${escapeText(event.title)}`,
		...(event.description
			? [`DESCRIPTION:${escapeText(event.description)}`]
			: []),
		...(event.url ? [`URL:${event.url}`] : []),
		"END:VEVENT",
		"END:VCALENDAR",
	].join("\r\n");
}

/** Hands the event to the browser as a file the calendar app opens. */
export function downloadIcs(event: CalendarEvent, fileName: string) {
	const blob = new Blob([buildIcs(event)], {
		type: "text/calendar;charset=utf-8",
	});
	const link = document.createElement("a");
	link.href = URL.createObjectURL(blob);
	link.download = fileName;
	link.click();
	URL.revokeObjectURL(link.href);
}
