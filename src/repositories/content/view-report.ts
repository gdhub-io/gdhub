import type { OutputData } from "@editorjs/editorjs";
import {
	getCleanTextContent,
	getEditorjsShortContent,
} from "@/helpers/content";
import { PUBLIC_EVENT_STATUSES } from "@/helpers/event";
import { getRelevantText } from "@/helpers/text";
import { prisma } from "@/services/prisma";
import {
	VIEW_REPORT_SUBJECTS,
	VIEWS_TOP_LIMIT,
	type ViewReportSubject,
	type ViewsDailyPoint,
	type ViewsReportResponse,
	type ViewsSummaryRow,
	type ViewsTopRow,
} from "@/types/admin-views";
import { CONTENT_VIEW_RETENTION_DAYS } from "@/types/content-views";

/**
 * The read side of `ContentView`.
 *
 * Kept apart from `content-view.repository.ts` on purpose: that module is the
 * write path, on the hot request route, and knows only how to count. This one is
 * an admin-only aggregation that has to know what every subject is *called* and
 * where its public page lives — seven models' worth of joins that have no
 * business being loaded to record a page view.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** `ContentView.viewedOn` is already a UTC `DATE`; nothing here re-zones it. */
const VIEWS_TIMEZONE = "UTC";

/** Derived titles are a table cell, not a paragraph. */
const DEVLOG_TITLE_LENGTH = 120;

const startOfUtcDay = (value: Date): Date =>
	new Date(
		Date.UTC(
			value.getUTCFullYear(),
			value.getUTCMonth(),
			value.getUTCDate(),
			0,
			0,
			0,
			0,
		),
	);

const parseUtcDay = (value: string): Date => new Date(`${value}T00:00:00.000Z`);

const addUtcDays = (value: Date, days: number): Date =>
	new Date(value.getTime() + days * DAY_MS);

const formatUtcDay = (value: Date): string => value.toISOString().slice(0, 10);

const countDays = (from: Date, to: Date): number =>
	Math.round((to.getTime() - from.getTime()) / DAY_MS) + 1;

export type ViewsRangeInput = { from: string; to: string };

export type ResolvedViewsRange = {
	/** Inclusive, midnight UTC. */
	from: Date;
	/** Inclusive, midnight UTC. */
	to: Date;
	/** The oldest day raw rows still exist for. */
	horizon: Date;
	/** The request asked for days older than `horizon`. */
	clamped: boolean;
};

/**
 * Pulls a requested range inside what the table can still answer for.
 *
 * Rows older than the retention horizon are deleted by the nightly prune, so a
 * range reaching past it does not return "no data" — it returns zeroes that look
 * exactly like measurements. Clamping and saying so is the only honest answer.
 */
export function resolveViewsRange(
	input: ViewsRangeInput,
	now: Date = new Date(),
): ResolvedViewsRange {
	const today = startOfUtcDay(now);
	const horizon = addUtcDays(today, -CONTENT_VIEW_RETENTION_DAYS);

	let from = parseUtcDay(input.from);
	let to = parseUtcDay(input.to);
	let clamped = false;

	if (from.getTime() < horizon.getTime()) {
		from = horizon;
		clamped = true;
	}

	if (to.getTime() < horizon.getTime()) {
		to = horizon;
		clamped = true;
	}

	// Nothing has been measured past today, and an unbounded end would build an
	// unbounded daily series. Not a retention clamp, so it does not set the flag.
	if (to.getTime() > today.getTime()) to = today;
	if (from.getTime() > to.getTime()) from = to;

	return { from, to, horizon, clamped };
}

const subjectFilter = (from: Date, to: Date) => ({
	subjectType: { in: [...VIEW_REPORT_SUBJECTS] },
	viewedOn: { gte: from, lte: to },
});

type CountedByType = { subjectType: string; _count: { _all: number } };

const countsByType = (rows: CountedByType[]): Map<string, number> =>
	new Map(rows.map((row) => [row.subjectType, row._count._all]));

const zeroTotals = (): Record<ViewReportSubject, number> =>
	Object.fromEntries(VIEW_REPORT_SUBJECTS.map((type) => [type, 0])) as Record<
		ViewReportSubject,
		number
	>;

/**
 * The daily series and the previous period in two `groupBy` calls — one when the
 * previous window is out of retention. The window totals are the per-type sum of
 * the daily rows, so asking the database for them again would aggregate the same
 * index range twice for a number already in hand.
 *
 * The rows are already one per subject × viewer × day, so counting them *is* the
 * distinct-viewer number — no de-duplication step belongs here.
 */
export async function getViewsReport(
	range: ResolvedViewsRange,
): Promise<ViewsReportResponse> {
	const days = countDays(range.from, range.to);
	const previousFrom = addUtcDays(range.from, -days);
	const previousTo = addUtcDays(range.from, -1);
	// A previous window that starts before the horizon was pruned, so its zero
	// would be a fabrication. The contract says `null` for exactly this case.
	const hasPrevious = previousFrom.getTime() >= range.horizon.getTime();

	const [dailyRows, previousRows] = await Promise.all([
		prisma.contentView.groupBy({
			by: ["subjectType", "viewedOn"],
			where: subjectFilter(range.from, range.to),
			_count: { _all: true },
		}),
		hasPrevious
			? prisma.contentView.groupBy({
					by: ["subjectType"],
					where: subjectFilter(previousFrom, previousTo),
					_count: { _all: true },
				})
			: Promise.resolve(null),
	]);

	const totals = new Map<string, number>();
	const measured = new Map<string, Record<ViewReportSubject, number>>();
	for (const row of dailyRows) {
		const day = formatUtcDay(row.viewedOn);
		const bucket = measured.get(day) ?? zeroTotals();
		bucket[row.subjectType as ViewReportSubject] = row._count._all;
		measured.set(day, bucket);
		totals.set(
			row.subjectType,
			(totals.get(row.subjectType) ?? 0) + row._count._all,
		);
	}

	const previousTotals = previousRows ? countsByType(previousRows) : null;

	const summary: ViewsSummaryRow[] = VIEW_REPORT_SUBJECTS.map((type) => ({
		type,
		total: totals.get(type) ?? 0,
		previousTotal: previousTotals ? (previousTotals.get(type) ?? 0) : null,
	}));

	// Every day of the window is emitted, empty or not: a missing day would let
	// the chart draw a straight line across a gap it never measured.
	const daily: ViewsDailyPoint[] = [];
	for (let index = 0; index < days; index += 1) {
		const day = formatUtcDay(addUtcDays(range.from, index));
		daily.push({ day, totals: measured.get(day) ?? zeroTotals() });
	}

	return {
		from: formatUtcDay(range.from),
		to: formatUtcDay(range.to),
		timezone: VIEWS_TIMEZONE,
		clamped: range.clamped,
		summary,
		daily,
	};
}

type SubjectDetail = {
	/** `null` when the record carries no name — naming it is the screen's job. */
	title: string | null;
	subtitle: string | null;
	href: string | null;
};

type SubjectLoader = (ids: string[]) => Promise<Map<string, SubjectDetail>>;

/**
 * A loader: fetch the batch, then say what one row is called and where it lives.
 *
 * `T` comes from the delegate call, so each `select` still types its own row.
 */
const loader =
	<T extends { id: string }>(
		fetch: (ids: string[]) => Promise<T[]>,
		detail: (row: T) => SubjectDetail,
	): SubjectLoader =>
	async (ids) =>
		new Map((await fetch(ids)).map((row) => [row.id, detail(row)]));

/** The secondary line, joined from whichever parts the record actually has. */
const secondary = (...parts: Array<string | null | undefined>): string | null =>
	getRelevantText(parts.map(getRelevantText).filter(Boolean).join(" · "));

const personName = (
	person: {
		name: string | null;
		profile: { name: string | null } | null;
	} | null,
): string | null =>
	getRelevantText(person?.profile?.name) ?? getRelevantText(person?.name);

/** A devlog has no title column, so the opening of its body stands in for one. */
const devlogTitle = (report: {
	content: string;
	contentEditor: unknown;
	project: { name: string } | null;
}): string | null => {
	const text = report.contentEditor
		? getEditorjsShortContent(
				report.contentEditor as OutputData,
				DEVLOG_TITLE_LENGTH,
			)
		: getCleanTextContent(report.content, DEVLOG_TITLE_LENGTH);

	return getRelevantText(text) ?? getRelevantText(report.project?.name);
};

/**
 * One loader per subject type: the titles, the secondary line and the public
 * href for a batch of ids.
 *
 * `href` is `null` the moment the page stops being public — no slug where the
 * route needs one, a draft, an archived record. The row still shows, because the
 * views were real; it just stops pretending there is somewhere to go.
 */
const SUBJECT_LOADERS: Record<ViewReportSubject, SubjectLoader> = {
	ProjectReport: loader(
		(ids) =>
			prisma.projectReport.findMany({
				where: { id: { in: ids } },
				select: {
					id: true,
					content: true,
					contentEditor: true,
					isSystem: true,
					project: { select: { name: true } },
					author: {
						select: { name: true, profile: { select: { name: true } } },
					},
				},
			}),
		(row) => ({
			title: devlogTitle(row),
			subtitle: secondary(row.project?.name, personName(row.author)),
			// Generated devlogs are 404 on the public route by design.
			href: row.isSystem ? null : `/devlog/${row.id}`,
		}),
	),

	BlogPost: loader(
		(ids) =>
			prisma.blogPost.findMany({
				where: { id: { in: ids } },
				select: {
					id: true,
					title: true,
					slug: true,
					status: true,
					authors: { select: { name: true } },
				},
			}),
		(row) => ({
			title: row.title,
			subtitle: secondary(
				row.authors
					.map((author) => getRelevantText(author.name))
					.filter(Boolean)
					.join(", "),
			),
			href: row.slug && row.status === "Published" ? `/blog/${row.slug}` : null,
		}),
	),

	CoursePage: loader(
		(ids) =>
			prisma.course.findMany({
				where: { id: { in: ids } },
				select: {
					id: true,
					name: true,
					slug: true,
					status: true,
					direction: { select: { name: true } },
				},
			}),
		(row) => ({
			title: row.name,
			subtitle: secondary(row.direction?.name),
			href:
				row.slug && row.status === "Published" ? `/course/${row.slug}` : null,
		}),
	),

	EventPage: loader(
		(ids) =>
			prisma.event.findMany({
				where: { id: { in: ids } },
				select: {
					id: true,
					title: true,
					slug: true,
					status: true,
					createdBy: {
						select: { name: true, profile: { select: { name: true } } },
					},
				},
			}),
		(row) => ({
			title: row.title,
			subtitle: secondary(personName(row.createdBy)),
			href:
				row.slug &&
				(PUBLIC_EVENT_STATUSES as readonly string[]).includes(row.status)
					? `/event/${row.slug}`
					: null,
		}),
	),

	ExpertPage: loader(
		(ids) =>
			prisma.speciality.findMany({
				where: { id: { in: ids } },
				select: {
					id: true,
					name: true,
					specialization: true,
					user: { select: { name: true, profile: { select: { name: true } } } },
				},
			}),
		(row) => ({
			// The page is a person, addressed by one of their specialities.
			title: personName(row.user) ?? row.name,
			subtitle: secondary(row.name, row.specialization),
			href: `/expert/${row.id}`,
		}),
	),

	VacancyPage: loader(
		(ids) =>
			prisma.teamVacancy.findMany({
				where: { id: { in: ids } },
				select: {
					id: true,
					title: true,
					status: true,
					team: { select: { project: { select: { name: true } } } },
				},
			}),
		(row) => ({
			title: row.title,
			subtitle: secondary(row.team?.project?.name),
			// A closed vacancy keeps its page — links to it are already out in the
			// world — but a draft was never public in the first place.
			href: row.status === "Draft" ? null : `/job/${row.id}`,
		}),
	),

	ProjectPage: loader(
		(ids) =>
			prisma.project.findMany({
				where: { id: { in: ids } },
				select: {
					id: true,
					name: true,
					slug: true,
					status: true,
					archivedAt: true,
					team: { select: { name: true } },
					author: {
						select: { name: true, profile: { select: { name: true } } },
					},
				},
			}),
		(row) => ({
			title: row.name,
			subtitle: secondary(row.team?.name ?? personName(row.author)),
			href:
				row.slug && !row.archivedAt && row.status !== "Archived"
					? `/project/${row.slug}`
					: null,
		}),
	),
};

/**
 * The ten most-viewed subjects of one type in the window.
 *
 * Two queries: the counts, then one `findMany` for the ten titles. A subject
 * whose record has since been deleted is dropped — there is nothing left to name
 * it with, and a row of blanks is worse than nine rows.
 */
export async function getTopSubjects(
	type: ViewReportSubject,
	range: ResolvedViewsRange,
): Promise<ViewsTopRow[]> {
	const grouped = await prisma.contentView.groupBy({
		by: ["subjectId"],
		where: { subjectType: type, viewedOn: { gte: range.from, lte: range.to } },
		_count: { _all: true },
		orderBy: { _count: { subjectId: "desc" } },
		take: VIEWS_TOP_LIMIT,
	});

	if (grouped.length === 0) return [];

	const details = await SUBJECT_LOADERS[type](
		grouped.map((row) => row.subjectId),
	);

	return grouped.flatMap((row) => {
		const detail = details.get(row.subjectId);
		if (!detail) return [];

		return [
			{
				id: row.subjectId,
				title: detail.title,
				subtitle: detail.subtitle,
				href: detail.href,
				views: row._count._all,
			},
		];
	});
}
