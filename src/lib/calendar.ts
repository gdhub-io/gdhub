import { google, outlook } from "calendar-link";
import { createEvents, type DateArray, type EventAttributes } from "ics";

/**
 * Calendar events as iCalendar (RFC 5545) and as links into Google and
 * Outlook, through the `ics` and `calendar-link` packages. An event without a
 * known hour is an all-day one on its date.
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

// Zero-width marks (Tolgee tags translated strings with them in development)
// would travel into the calendar's title.
const clean = (text: string) =>
	text.replace(/[\u200B-\u200D\u2060\uFEFF]/g, "");

const dateOf = (date: Date): DateArray => [
	date.getUTCFullYear(),
	date.getUTCMonth() + 1,
	date.getUTCDate(),
];

const toAttributes = (event: CalendarEvent): EventAttributes => ({
	uid: event.uid,
	title: clean(event.title),
	...(event.description && { description: clean(event.description) }),
	...(event.url && { url: event.url }),
	productId: "GDHub//Checkpoints",
	...(event.allDay
		? {
				start: dateOf(event.start),
				end: dateOf(new Date(event.start.getTime() + 86_400_000)),
			}
		: {
				start: event.start.getTime(),
				startInputType: "utc",
				startOutputType: "utc",
				duration: { minutes: event.minutes ?? 60 },
			}),
});

/** One file for any number of events; `name` titles a subscribed calendar. */
export function buildIcs(events: CalendarEvent[], name?: string) {
	const { error, value } = createEvents(
		events.map(toAttributes),
		name ? { calName: name } : undefined,
	);
	if (error || !value) throw error ?? new Error("ics");
	return value;
}

/** Hands the events to the browser as a file the calendar app opens. */
export function downloadIcs(events: CalendarEvent[], fileName: string) {
	const blob = new Blob([buildIcs(events)], {
		type: "text/calendar;charset=utf-8",
	});
	const link = document.createElement("a");
	link.href = URL.createObjectURL(blob);
	link.download = fileName;
	link.click();
	URL.revokeObjectURL(link.href);
}

const linkEvent = (event: CalendarEvent) => ({
	title: clean(event.title),
	start: event.start,
	allDay: event.allDay,
	duration: [event.minutes ?? 60, "minute"] as [number, "minute"],
	description: event.description,
	url: event.url,
});

/** Opens the event in Google Calendar, ready to save. */
export const googleCalendarUrl = (event: CalendarEvent) =>
	google(linkEvent(event));

/** Opens the event in Outlook on the web, ready to save. */
export const outlookCalendarUrl = (event: CalendarEvent) =>
	outlook(linkEvent(event));
