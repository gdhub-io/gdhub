import type { ContentViewSubject } from "@/config/prisma-enums";

/**
 * The subjects the report covers.
 *
 * `ScoutPage` is in the enum but has no public page to be viewed, so it would
 * only ever contribute a flat zero — the screen leaves it out rather than draw a
 * type that cannot move. Order is binding: it is the slot order the series
 * palette was validated in.
 */
export const VIEW_REPORT_SUBJECTS = [
	"ProjectReport",
	"BlogPost",
	"CoursePage",
	"EventPage",
	"ExpertPage",
	"VacancyPage",
	"ProjectPage",
] as const satisfies readonly ContentViewSubject[];

export type ViewReportSubject = (typeof VIEW_REPORT_SUBJECTS)[number];

/** How many rows the "top by views" panel holds, whatever the type returns. */
export const VIEWS_TOP_LIMIT = 10;

export type ViewsSummaryRow = {
	type: ViewReportSubject;
	total: number;
	/**
	 * The same-length window immediately before this one. `null` when that window
	 * falls outside retention — the screen must be able to tell "we do not know"
	 * from "it was zero".
	 */
	previousTotal: number | null;
};

/** One day of the window. Days with no views are present with zeroes, not absent. */
export type ViewsDailyPoint = {
	/** `YYYY-MM-DD` in the payload's `timezone`. */
	day: string;
	totals: Record<ViewReportSubject, number>;
};

export type ViewsReportResponse = {
	/** Inclusive bounds, `YYYY-MM-DD`, already clamped to retention by the server. */
	from: string;
	to: string;
	/** The zone the day buckets were cut in, for the header to print. */
	timezone: string;
	/** True when the requested range was older than retention and got clamped. */
	clamped: boolean;
	summary: ViewsSummaryRow[];
	daily: ViewsDailyPoint[];
};

export type ViewsTopRow = {
	id: string;
	/** `null` when the record carries no name of its own — the screen names it. */
	title: string | null;
	/**
	 * Project and author for a devlog, organiser for an event, and so on. `null`
	 * when the platform has none — the screen prints a dash for it, never "".
	 */
	subtitle: string | null;
	/** The public page. `null` once that page has stopped being public. */
	href: string | null;
	views: number;
};

export type ViewsTopResponse = {
	type: ViewReportSubject;
	rows: ViewsTopRow[];
};
