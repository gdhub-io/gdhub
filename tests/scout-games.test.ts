import {
	ProjectStatus,
	SkillLevel,
	TeamMemberStatus,
	TeamVacancyStatus,
} from "@gdhub-io/gdhub-prisma";
import { NextRequest } from "next/server";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const authMock = vi.fn();
const projectFindMany = vi.fn();
const projectCount = vi.fn();
const stepFindMany = vi.fn();
const reportGroupBy = vi.fn();
const applauseCounts = vi.fn();

vi.mock("@/auth", () => ({ auth: () => authMock() }));

// The guard has its own suite (space-guard.test.ts). Here it would only stand
// between the test and the query being asserted.
vi.mock("@/lib/space-guard", () => ({
	withSpaceGuard: () => (handler: unknown) => handler,
}));

vi.mock("@/services/prisma", () => ({
	prisma: {
		project: {
			findMany: (...args: unknown[]) => projectFindMany(...args),
			count: (...args: unknown[]) => projectCount(...args),
			getApplauseCounts: (...args: unknown[]) => applauseCounts(...args),
		},
		projectWorkflowStep: {
			findMany: (...args: unknown[]) => stepFindMany(...args),
		},
		projectReport: {
			groupBy: (...args: unknown[]) => reportGroupBy(...args),
		},
		auditLog: { create: vi.fn() },
	},
}));

const scout = {
	id: "u-scout",
	roles: ["Member"],
	onboardingDone: true,
};

const project = (over: Record<string, unknown> = {}) => ({
	id: "p1",
	name: "E2E Test Game",
	slug: "e2e-test-game",
	coverImage: null,
	genre: "Strategy",
	platform: "PC",
	updatedAt: new Date("2026-08-01T00:00:00.000Z"),
	author: { id: "u1", name: "Marty", image: null },
	workflow: {
		currentStep: { name: "Prototype" },
		steps: [
			{ name: "Introduction", order: 1, done: true },
			{ name: "Ideation", order: 2, done: true },
			{ name: "Prototyping", order: 3, done: false },
		],
	},
	team: {
		members: [
			{
				speciality: { level: SkillLevel.Skillful },
				user: { profile: { timeForWork: [10, 10] } },
			},
			{
				speciality: { level: SkillLevel.Expert },
				user: { profile: { timeForWork: [5, 15] } },
			},
			{
				speciality: { level: SkillLevel.Novice },
				user: { profile: null },
			},
		],
		investors: [
			{ value: 30_000, currency: "USD" },
			{ value: 10_000, currency: "USD" },
			{ value: 5_000, currency: "EUR" },
		],
		_count: { vacancies: 2 },
	},
	_count: { estimations: 2, reports: 5 },
	...over,
});

const call = async (query = "") => {
	const { GET } = await import("@/app/api/scout/games/route");
	const request = new NextRequest(`http://localhost/api/scout/games${query}`);

	return (GET as never as (r: NextRequest, c: unknown) => Promise<Response>)(
		request,
		{ params: Promise.resolve({}) },
	);
};

const listArgs = () => projectFindMany.mock.calls[0][0];

// The fixture is pinned to an August 2026 updatedAt and the activity score adds a
// bonus for an edit within the last month, so the expected score would otherwise
// drift with the calendar.
beforeAll(() => {
	vi.useFakeTimers({ toFake: ["Date"] });
	vi.setSystemTime(new Date("2026-08-15T00:00:00.000Z"));
});

afterAll(() => {
	vi.useRealTimers();
});

beforeEach(() => {
	vi.clearAllMocks();
	authMock.mockResolvedValue({ user: scout });
	projectFindMany.mockResolvedValue([project()]);
	projectCount.mockResolvedValue(1);
	stepFindMany.mockResolvedValue([{ name: "Prototype" }]);
	reportGroupBy.mockResolvedValue([{ projectId: "p1", _count: { _all: 2 } }]);
	applauseCounts.mockResolvedValue(new Map([["p1", 10]]));
});

describe("GET /api/scout/games", () => {
	it("returns the freshest project first", async () => {
		await call();

		// Relevance in this table is recency of work: `updatedAt` is what the
		// Last activity column shows, so the default order has to be the same
		// value, or the first row contradicts the column it is sorted by.
		expect(listArgs().orderBy).toEqual({ updatedAt: "desc" });
	});

	it("leaves out projects a scout would not act on", async () => {
		await call();

		expect(listArgs().where.status).toEqual({
			in: [
				ProjectStatus.Registered,
				ProjectStatus.Approved,
				ProjectStatus.Released,
			],
		});
	});

	it("narrows by focus: platform, genre and stage together", async () => {
		await call("?platforms=PC,Console&genres=Strategy&stages=Prototype");

		expect(listArgs().where).toMatchObject({
			platform: { in: ["PC", "Console"] },
			genre: { in: ["Strategy"] },
			workflow: { currentStep: { name: { in: ["Prototype"] } } },
		});
	});

	it("does not filter on an axis the scout left empty", async () => {
		await call("?genres=Strategy");

		const { where } = listArgs();

		expect(where.genre).toEqual({ in: ["Strategy"] });
		expect(where).not.toHaveProperty("platform");
	});

	it("hides the stages a scout has no deal to do with", async () => {
		await call();

		// The names the `default` workflow actually seeds: registered and no
		// more, and the two that come after release.
		const [, stageFilter] = listArgs().where.AND;

		expect(stageFilter.NOT.workflow.is.currentStep.is.name.in).toEqual([
			"Introduction",
			"Support",
			"Project Completion",
		]);
	});

	it("keeps a project that has no workflow to be dull in", async () => {
		await call();

		// A negation, not an `in`: saying nothing about your stage is not the
		// same as saying you are somewhere a scout would skip.
		expect(listArgs().where).not.toHaveProperty("workflow");
	});

	it("leaves out projects whose author anonymised their account", async () => {
		await call();

		// `personalDataDeletedAt` is what the GDPR deletion stamps: the row is
		// still there under placeholder names, but there is nobody to talk to.
		const [abandoned] = listArgs().where.AND;

		expect(abandoned.NOT.author).toEqual({
			is: { personalDataDeletedAt: { not: null } },
		});
	});

	it("shows a hidden stage the moment the scout asks for it", async () => {
		await call("?stages=Support");

		const { where } = listArgs();

		expect(where.workflow).toEqual({
			currentStep: { name: { in: ["Support"] } },
		});
		// Only the abandoned-author filter is left; the stage default steps aside.
		expect(where.AND).toHaveLength(1);
	});

	it("searches by name, case-insensitively", async () => {
		await call("?search=tide");

		expect(listArgs().where.name).toEqual({
			contains: "tide",
			mode: "insensitive",
		});
	});

	it("pages in the database when the database can do the ordering", async () => {
		await call("?sort=activity&page=3&limit=10");

		expect(listArgs()).toMatchObject({ skip: 20, take: 10 });
	});

	it("opens on the projects being worked on hardest", async () => {
		const busy = { ...project({ id: "p2" }), _count: { estimations: 0, reports: 9 } };
		projectFindMany.mockResolvedValue([project(), busy]);
		reportGroupBy.mockResolvedValue([]);

		const body = await (await call()).json();

		expect(body.data.map((row: { id: string }) => row.id)).toEqual(["p2", "p1"]);
	});

	it("counts a team from confirmed members only", async () => {
		await call();

		expect(listArgs().select.team.select.members.where).toEqual({
			status: { in: [TeamMemberStatus.Hired, TeamMemberStatus.Founder] },
			// A member who has left is not the team, and must not be priced as a seat.
			finishedAt: null,
		});
	});

	it("counts only published vacancies as open positions", async () => {
		await call();

		expect(listArgs().select.team.select._count.select.vacancies).toEqual({
			where: { status: TeamVacancyStatus.Published },
		});
	});

	it("takes applause from the shared count, not from a relation join", async () => {
		const response = await call();
		const body = await response.json();

		expect(applauseCounts).toHaveBeenCalledWith({ projectIds: ["p1"] });
		expect(body.data[0]).toMatchObject({
			id: "p1",
			stage: "Prototype",
			applauseCount: 10,
			reviewCount: 2,
			teamSize: 3,
		});
	});

	it("estimates what a project has cost when nobody has stated a figure", async () => {
		const body = await (await call()).json();

		expect(body.data[0].estimatedInvestment).toMatchObject({
			teamSize: 3,
			openPositions: 2,
		});
		expect(body.data[0].estimatedInvestment.remaining).toBeGreaterThan(0);
	});

	it("totals investor money inside each currency, never across them", async () => {
		const body = await (await call()).json();

		// Two USD investors add up; the euro one is its own line, because one
		// sum over three currencies would be a number that means nothing.
		expect(body.data[0].raised).toEqual([
			{ currency: "USD", amount: 40_000 },
			{ currency: "EUR", amount: 5_000 },
		]);
	});

	it("says nothing about money nobody has put in", async () => {
		projectFindMany.mockResolvedValue([
			project({
				team: { members: [], investors: [], _count: { vacancies: 1 } },
			}),
		]);

		const body = await (await call()).json();

		expect(body.data[0].raised).toEqual([]);
		// And the ask stays empty until the schema can carry one.
		expect(body.data[0].investment).toBeNull();
	});

	it("leaves the estimate out for a project with nobody on it", async () => {
		projectFindMany.mockResolvedValue([
			project({
				team: { members: [], investors: [], _count: { vacancies: 0 } },
			}),
		]);

		const body = await (await call()).json();

		expect(body.data[0].estimatedInvestment).toBeNull();
	});

	it("scores activity the way the rest of the platform does", async () => {
		const body = await (await call()).json();

		// Five posts at two, two of them from this month at three, and an edit
		// inside the month at a half.
		expect(body.data[0].activityScore).toBe(5 * 2 + 2 * 3 + 0.5);
		expect(body.data[0].devlogCount).toBe(5);
	});

	it("reads whole, not paged, when the sort is one SQL cannot do", async () => {
		await call("?sort=toRelease&direction=asc");

		expect(listArgs().skip).toBeUndefined();
		expect(listArgs().take).toBeGreaterThan(20);
	});

	it("orders by a derived column and pages the result itself", async () => {
		projectFindMany.mockResolvedValue([project({ id: "p2" }), project()]);
		applauseCounts.mockResolvedValue(new Map([["p1", 10]]));

		const loudest = await (await call("?sort=applause&direction=desc")).json();
		expect(loudest.data.map((row: { id: string }) => row.id)).toEqual([
			"p1",
			"p2",
		]);

		const quietest = await (await call("?sort=applause&direction=asc")).json();
		expect(quietest.data.map((row: { id: string }) => row.id)).toEqual([
			"p2",
			"p1",
		]);
	});

	it("refuses a column it cannot sort by", async () => {
		const response = await call("?sort=vibes");

		expect(response.status).toBe(400);
	});

	it("says whether another page exists, from the rows it actually read", async () => {
		projectCount.mockResolvedValue(45);

		const paged = await (
			await call("?sort=activity&page=2&limit=20")
		).json();

		expect(paged.meta).toMatchObject({
			currentPage: 2,
			totalCount: 45,
			isLastPage: false,
		});

		// A derived sort reads a capped set, so the count is the rows in hand —
		// never the database's, which would offer pages that come back empty.
		const derived = await (await call("?sort=applause")).json();

		expect(derived.meta).toMatchObject({ totalCount: 1, isLastPage: true });
	});

});

describe("GET /api/scout/games/facets", () => {
	it("offers only the values the visible projects actually have", async () => {
		const { GET } = await import("@/app/api/scout/games/facets/route");
		projectFindMany
			.mockResolvedValueOnce([{ genre: "Strategy" }])
			.mockResolvedValueOnce([{ platform: "PC" }]);

		const response = await (
			GET as never as (r: NextRequest, c: unknown) => Promise<Response>
		)(new NextRequest("http://localhost/api/scout/games/facets"), {
			params: Promise.resolve({}),
		});

		// Its own resource: the list used to recompute this on every keystroke,
		// and the Investment Focus form used to run the whole games pipeline for it.
		expect(await response.json()).toEqual({
			genres: ["Strategy"],
			platforms: ["PC"],
			stages: ["Prototype"],
		});
	});
});
