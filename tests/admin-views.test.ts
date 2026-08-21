import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	getTopSubjects,
	getViewsReport,
	resolveViewsRange,
} from "../src/repositories/content-view-report.repository";
import {
	ViewsReportQuerySchema,
	ViewsTopQuerySchema,
} from "../src/schemas/admin-views";
import { prisma } from "../src/services/prisma";
import { VIEW_REPORT_SUBJECTS } from "../src/types/admin-views";

vi.mock("../src/services/prisma", () => ({
	prisma: {
		contentView: { groupBy: vi.fn() },
		projectReport: { findMany: vi.fn() },
		blogPost: { findMany: vi.fn() },
		course: { findMany: vi.fn() },
		event: { findMany: vi.fn() },
		speciality: { findMany: vi.fn() },
		teamVacancy: { findMany: vi.fn() },
		project: { findMany: vi.fn() },
	},
}));

const NOW = new Date("2026-08-20T09:31:00.000Z");
/** `NOW − 90 days`, the oldest day raw rows still exist for. */
const HORIZON = "2026-05-22";

const day = (value: string) => new Date(`${value}T00:00:00.000Z`);

const groupBy = prisma.contentView.groupBy as unknown as ReturnType<typeof vi.fn>;

/** Answers the report queries in the order `Promise.all` issues them. */
const mockReport = (options: {
	daily?: Array<[string, string, number]>;
	previous?: Array<[string, number]>;
}) => {
	const calls = [
		(options.daily ?? []).map(([subjectType, viewedOn, count]) => ({
			subjectType,
			viewedOn: day(viewedOn),
			_count: { _all: count },
		})),
		(options.previous ?? []).map(([subjectType, count]) => ({
			subjectType,
			_count: { _all: count },
		})),
	];

	let index = 0;
	groupBy.mockImplementation(() => Promise.resolve(calls[index++] ?? []));
};

beforeEach(() => {
	vi.clearAllMocks();
});

describe("resolveViewsRange", () => {
	it("clamps a range that reaches past retention and says so", () => {
		const range = resolveViewsRange(
			{ from: "2026-01-01", to: "2026-08-20" },
			NOW,
		);

		expect(range.from.toISOString().slice(0, 10)).toBe(HORIZON);
		expect(range.clamped).toBe(true);
	});

	it("leaves a range inside retention alone", () => {
		const range = resolveViewsRange(
			{ from: "2026-08-01", to: "2026-08-20" },
			NOW,
		);

		expect(range.from).toEqual(day("2026-08-01"));
		expect(range.to).toEqual(day("2026-08-20"));
		expect(range.clamped).toBe(false);
	});

	it("collapses a window that lies entirely before retention onto the horizon", () => {
		const range = resolveViewsRange(
			{ from: "2025-01-01", to: "2025-02-01" },
			NOW,
		);

		expect(range.from).toEqual(day(HORIZON));
		expect(range.to).toEqual(day(HORIZON));
		expect(range.clamped).toBe(true);
	});

	it("does not report days that have not happened yet", () => {
		const range = resolveViewsRange(
			{ from: "2026-08-18", to: "2026-12-31" },
			NOW,
		);

		expect(range.to).toEqual(day("2026-08-20"));
		// Trimming the future is not a retention clamp.
		expect(range.clamped).toBe(false);
	});
});

describe("getViewsReport", () => {
	it("reports the clamped bounds, the UTC zone and the clamp flag", async () => {
		mockReport({ daily: [["BlogPost", "2026-05-24", 3]] });

		const report = await getViewsReport(
			resolveViewsRange({ from: "2020-01-01", to: "2026-05-24" }, NOW),
		);

		expect(report.from).toBe(HORIZON);
		expect(report.to).toBe("2026-05-24");
		expect(report.timezone).toBe("UTC");
		expect(report.clamped).toBe(true);
	});

	it("carries every day of the window, empty ones with zeroes", async () => {
		mockReport({
			daily: [
				["BlogPost", "2026-08-01", 2],
				["BlogPost", "2026-08-03", 3],
			],
		});

		const report = await getViewsReport(
			resolveViewsRange({ from: "2026-08-01", to: "2026-08-03" }, NOW),
		);

		expect(report.daily.map((point) => point.day)).toEqual([
			"2026-08-01",
			"2026-08-02",
			"2026-08-03",
		]);
		// The gap is a measured zero, not a missing point for the chart to bridge.
		expect(report.daily[1].totals.BlogPost).toBe(0);
		// All seven types are present on every day, including the empty one.
		for (const point of report.daily) {
			expect(Object.keys(point.totals).sort()).toEqual(
				[...VIEW_REPORT_SUBJECTS].sort(),
			);
		}
	});

	it("sums the daily rows into the summary, unseen types at zero", async () => {
		mockReport({
			daily: [
				["BlogPost", "2026-08-18", 2],
				["BlogPost", "2026-08-20", 3],
			],
			previous: [["BlogPost", 4]],
		});

		const report = await getViewsReport(
			resolveViewsRange({ from: "2026-08-18", to: "2026-08-20" }, NOW),
		);

		expect(report.summary.map((row) => row.type)).toEqual([
			...VIEW_REPORT_SUBJECTS,
		]);
		expect(report.summary[1]).toEqual({
			type: "BlogPost",
			total: 5,
			previousTotal: 4,
		});
		const projects = report.summary.find((row) => row.type === "ProjectPage");
		expect(projects).toEqual({
			type: "ProjectPage",
			total: 0,
			previousTotal: 0,
		});
	});

	it("asks for the previous window immediately before this one", async () => {
		mockReport({});

		await getViewsReport(
			resolveViewsRange({ from: "2026-08-18", to: "2026-08-20" }, NOW),
		);

		// The window totals are folded out of the daily rows, so only the series
		// and the previous window are queried.
		expect(groupBy).toHaveBeenCalledTimes(2);
		expect(groupBy.mock.calls[1][0].where.viewedOn).toEqual({
			gte: day("2026-08-15"),
			lte: day("2026-08-17"),
		});
	});

	it("returns a null previous total when that window predates retention", async () => {
		mockReport({ daily: [["BlogPost", "2026-08-20", 5]] });

		const report = await getViewsReport(
			// A full 90 days: the window before it was pruned in its entirety.
			resolveViewsRange({ from: "2026-05-23", to: "2026-08-20" }, NOW),
		);

		for (const row of report.summary) {
			// `null` is "we no longer know", which is not the same as "nobody looked".
			expect(row.previousTotal).toBeNull();
		}
		// Only the daily series was queried.
		expect(groupBy).toHaveBeenCalledTimes(1);
	});
});

describe("getTopSubjects", () => {
	const range = resolveViewsRange({ from: "2026-08-01", to: "2026-08-20" }, NOW);

	const mockCounts = (rows: Array<[string, number]>) => {
		groupBy.mockResolvedValue(
			rows.map(([subjectId, count]) => ({
				subjectId,
				_count: { _all: count },
			})),
		);
	};

	it("orders by the count and takes ten", async () => {
		mockCounts([["post-1", 9]]);
		(prisma.blogPost.findMany as any).mockResolvedValue([
			{
				id: "post-1",
				title: "Patch notes",
				slug: "patch-notes",
				status: "Published",
				authors: [{ name: "Ada" }],
			},
		]);

		const rows = await getTopSubjects("BlogPost", range);

		expect(groupBy.mock.calls[0][0]).toMatchObject({
			by: ["subjectId"],
			orderBy: { _count: { subjectId: "desc" } },
			take: 10,
		});
		expect(rows).toEqual([
			{
				id: "post-1",
				title: "Patch notes",
				subtitle: "Ada",
				href: "/blog/patch-notes",
				views: 9,
			},
		]);
	});

	it("has no href for a record with no slug", async () => {
		mockCounts([["post-1", 4]]);
		(prisma.blogPost.findMany as any).mockResolvedValue([
			{
				id: "post-1",
				title: "Untitled draft",
				slug: null,
				status: "Published",
				authors: [],
			},
		]);

		const [row] = await getTopSubjects("BlogPost", range);

		expect(row.href).toBeNull();
		// Absent, not empty — the screen prints a dash for it.
		expect(row.subtitle).toBeNull();
	});

	it("has no href for an unpublished record", async () => {
		mockCounts([["course-1", 4]]);
		(prisma.course.findMany as any).mockResolvedValue([
			{
				id: "course-1",
				name: "Level design",
				slug: "level-design",
				status: "Draft",
				direction: { name: "Design" },
			},
		]);

		const [row] = await getTopSubjects("CoursePage", range);

		expect(row.href).toBeNull();
		expect(row.subtitle).toBe("Design");
	});

	it("has no href for an archived project", async () => {
		mockCounts([["project-1", 7]]);
		(prisma.project.findMany as any).mockResolvedValue([
			{
				id: "project-1",
				name: "Starfall",
				slug: "starfall",
				status: "Archived",
				archivedAt: new Date("2026-08-01T00:00:00.000Z"),
				team: { name: "Starfall Team" },
				author: { name: "Ada", profile: null },
			},
		]);

		const [row] = await getTopSubjects("ProjectPage", range);

		expect(row.href).toBeNull();
		expect(row.subtitle).toBe("Starfall Team");
	});

	it("titles a devlog from its body and names its project and author", async () => {
		mockCounts([["report-1", 12]]);
		(prisma.projectReport.findMany as any).mockResolvedValue([
			{
				id: "report-1",
				content: "## Week 3\nThe combat loop finally holds together.",
				contentEditor: null,
				isSystem: false,
				project: { name: "Starfall" },
				author: { name: "ada@example.com", profile: { name: "Ada" } },
			},
		]);

		const [row] = await getTopSubjects("ProjectReport", range);

		expect(row.title).toBe("Week 3 The combat loop finally holds together.");
		expect(row.subtitle).toBe("Starfall · Ada");
		expect(row.href).toBe("/devlog/report-1");
	});

	it("drops a subject whose record is gone rather than showing a blank row", async () => {
		mockCounts([
			["report-1", 12],
			["report-2", 3],
		]);
		(prisma.projectReport.findMany as any).mockResolvedValue([
			{
				id: "report-2",
				content: "Still here.",
				contentEditor: null,
				isSystem: false,
				project: { name: "Starfall" },
				author: { name: "Ada", profile: null },
			},
		]);

		const rows = await getTopSubjects("ProjectReport", range);

		expect(rows.map((row) => row.id)).toEqual(["report-2"]);
	});

	it("does not query the subject table when nothing was viewed", async () => {
		mockCounts([]);

		expect(await getTopSubjects("ProjectReport", range)).toEqual([]);
		expect(prisma.projectReport.findMany).not.toHaveBeenCalled();
	});
});

describe("query schemas", () => {
	it("rejects a range that runs backwards", () => {
		expect(
			ViewsReportQuerySchema.safeParse({ from: "2026-08-20", to: "2026-08-01" })
				.success,
		).toBe(false);
	});

	it("rejects a day that is not a calendar date", () => {
		expect(
			ViewsReportQuerySchema.safeParse({ from: "2026-02-31", to: "2026-03-01" })
				.success,
		).toBe(false);
	});

	it("accepts a range older than retention — clamping is the server's job", () => {
		expect(
			ViewsReportQuerySchema.safeParse({ from: "2019-01-01", to: "2026-08-20" })
				.success,
		).toBe(true);
	});

	it("rejects a subject type outside the report's seven", () => {
		const query = { from: "2026-08-01", to: "2026-08-20" };

		expect(ViewsTopQuerySchema.safeParse({ ...query, type: "ScoutPage" }).success)
			.toBe(false);
		expect(ViewsTopQuerySchema.safeParse({ ...query, type: "BlogPost" }).success)
			.toBe(true);
	});
});
