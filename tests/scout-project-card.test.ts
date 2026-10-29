import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const projectFindFirst = vi.fn();
const documentFindMany = vi.fn();
const workflowFindFirst = vi.fn();
const reportFindMany = vi.fn();
const stepFindMany = vi.fn();
const estimationFindMany = vi.fn();
const memberFindMany = vi.fn();
const checkpointFindMany = vi.fn();
const checkpointNumbers = vi.fn();

vi.mock("@/auth", () => ({ auth: () => authMock() }));

vi.mock("@/lib/space-guard", () => ({
	withSpaceGuard: () => (handler: unknown) => handler,
}));

vi.mock("@/repositories/checkpoints/number", () => ({
	checkpointNumbers: (...a: unknown[]) => checkpointNumbers(...a),
}));
vi.mock("@/services/prisma", () => ({
	prisma: {
		project: { findFirst: (...a: unknown[]) => projectFindFirst(...a) },
		projectArtifact: { findMany: (...a: unknown[]) => documentFindMany(...a) },
		projectWorkflow: { findFirst: (...a: unknown[]) => workflowFindFirst(...a) },
		projectReport: { findMany: (...a: unknown[]) => reportFindMany(...a) },
		projectWorkflowStep: { findMany: (...a: unknown[]) => stepFindMany(...a) },
		projectEstimation: {
			findMany: (...a: unknown[]) => estimationFindMany(...a),
		},
		teamMember: { findMany: (...a: unknown[]) => memberFindMany(...a) },
		projectCheckpoint: {
			findMany: (...a: unknown[]) => checkpointFindMany(...a),
		},
		auditLog: { create: vi.fn() },
	},
}));

const scout = { id: "u-scout", roles: ["Member"], onboardingDone: true };

const call = async (
	route: "overview" | "section",
	params: Record<string, string>,
	query = "",
) => {
	const { GET } =
		route === "overview"
			? await import("@/app/api/scout/games/[id]/route")
			: await import("@/app/api/scout/games/[id]/[section]/route");

	return (GET as never as (r: NextRequest, c: unknown) => Promise<Response>)(
		new NextRequest(`http://localhost/api/scout/games/p1${query}`),
		{ params: Promise.resolve(params) },
	);
};

beforeEach(() => {
	checkpointFindMany.mockResolvedValue([]);
	vi.clearAllMocks();
	authMock.mockResolvedValue({ user: scout });
	projectFindFirst.mockResolvedValue({ id: "p1" });
	documentFindMany.mockResolvedValue([]);
	workflowFindFirst.mockResolvedValue(null);
	reportFindMany.mockResolvedValue([]);
	stepFindMany.mockResolvedValue([]);
	estimationFindMany.mockResolvedValue([]);
	memberFindMany.mockResolvedValue([]);
});

describe("GET /api/scout/games/[id]", () => {
	it("404s on a project the games table would never have offered", async () => {
		projectFindFirst.mockResolvedValue(null);

		expect((await call("overview", { id: "p1" })).status).toBe(404);
	});

	it("reads the header and the facts Overview leads with, and no more", async () => {
		projectFindFirst.mockResolvedValue({
			id: "p1",
			name: "Hollow Tide",
			slug: "hollow-tide",
			description: "A hand-painted adventure",
			coverImage: null,
			videoLink: null,
			startedAt: new Date("2026-03-10"),
			updatedAt: new Date("2026-08-01"),
			genre: "Adventure",
			platform: "PC",
			setting: null,
			visualStyle: null,
			audition: null,
			links: [],
			author: { id: "u1", name: "Owen", image: null, specialities: [] },
			workflow: {
				currentStep: { name: "Prototyping", plannedAt: null },
				steps: [
					// Prisma filters the relation, so a step carries the settings
					// task or nothing.
					{
						name: "Ideation",
						order: 1,
						done: true,
						tasks: [{ name: "Fill in the project settings" }],
					},
					{ name: "Prototyping", order: 4, done: false, tasks: [] },
				],
			},
			team: {
				members: [
					{
						id: "m1",
						user: { id: "u2", name: "Sofia", image: null, profile: null },
						speciality: { level: "Skillful" },
					},
				],
				_count: { investors: 2, vacancies: 1 },
			},
			_count: { estimations: 2, reports: 12 },
			reports: [],
		});

		const body = await (await call("overview", { id: "p1" })).json();

		expect(body).toMatchObject({
			name: "Hollow Tide",
			stage: "Prototyping",
			// The stage under the start date is the first step of the workflow,
			// not the one the project happens to sit on now.
			startedStage: "Ideation",
			// Quoted from the workflow rather than restated: the author is
			// already looking at this verdict on their own workflow page.
			detailsTask: "Fill in the project settings",
			teamSize: 1,
			investorCount: 2,
			reviewCount: 2,
		});
		// The ROUND card reads the same estimator the games table sorts by, so
		// the two cannot quote different numbers for the same project.
		expect(body.estimate.remaining).toBeGreaterThan(0);
		// The heavy relations belong to their own sections.
		expect(body).not.toHaveProperty("team.members");
		expect(body).not.toHaveProperty("documents");
	});
});

describe("GET /api/scout/games/[id]/[section]", () => {
	it("refuses a section that does not exist", async () => {
		const response = await call("section", { id: "p1", section: "secrets" });

		expect(response.status).toBe(404);
	});

	it("returns nothing for a project the scout may not see", async () => {
		projectFindFirst.mockResolvedValue(null);
		documentFindMany.mockResolvedValue([{ id: "d1" }]);

		const response = await call("section", { id: "p1", section: "files" });

		// The guard and the read run together — a section is a plain read, and
		// waiting for the check before starting it cost a round trip on every
		// tab. What the read returned is discarded, never sent.
		expect(response.status).toBe(404);
		expect(await response.json()).not.toHaveProperty("0");
	});

	it("passes the digest limit through, so Overview reads a handful", async () => {
		await call("section", { id: "p1", section: "files" }, "?limit=2");

		expect(documentFindMany.mock.calls[0][0].take).toBe(2);
	});

	it("stays bounded when no limit is asked for", async () => {
		await call("section", { id: "p1", section: "files" });

		// The route validates a maximum of 50; reading without a `LIMIT` at all
		// would let one project with a thousand documents answer for everyone.
		expect(documentFindMany.mock.calls[0][0].take).toBe(50);
	});

	it("refuses a limit that is not a sane page", async () => {
		expect(
			(await call("section", { id: "p1", section: "files" }, "?limit=0")).status,
		).toBe(400);
		expect(
			(await call("section", { id: "p1", section: "files" }, "?limit=500"))
				.status,
		).toBe(400);
	});

	it("merges every stamped event into one dated feed", async () => {
		projectFindFirst.mockResolvedValue({
			id: "p1",
			createdAt: new Date("2026-03-10"),
			author: { name: "Owen" },
		});
		reportFindMany.mockResolvedValue([
			{
				id: "r1",
				publishedAt: new Date("2026-07-22"),
				author: { name: "Owen" },
			},
		]);
		stepFindMany.mockResolvedValue([
			{ id: "s1", name: "Concepting", finishedAt: new Date("2026-08-02") },
		]);
		documentFindMany.mockResolvedValue([
			{
				id: "d1",
				name: "Concept.pdf",
				type: "Concept",
				createdAt: new Date("2026-07-20"),
				createdByUser: { name: "Sofia" },
			},
		]);
		memberFindMany.mockResolvedValue([
			{
				id: "m1",
				startedAt: new Date("2026-07-16"),
				user: { name: "Mia" },
			},
			// Stamped a second before the project row, the way a founder's
			// membership is written at creation.
			{
				id: "m0",
				startedAt: new Date("2026-03-09T23:59:59Z"),
				user: { name: "Owen" },
			},
		]);

		const body = await (
			await call("section", { id: "p1", section: "activities" })
		).json();

		// The ids are namespaced so a devlog and a step that share a cuid cannot
		// collide as React keys.
		// Newest first, and the project's own registration is the log's floor —
		// nothing sorts below it, however the other stamps fall.
		expect(body.map((row: { id: string }) => row.id)).toEqual([
			"step-s1",
			"devlog-r1",
			"file-d1",
			"member-m1",
			"member-m0",
			"project-created",
		]);
		expect(body[2]).toMatchObject({
			kind: "file",
			subject: "Concept.pdf",
			author: "Sofia",
		});
	});

	it("answers To release with the team's ask, the estimate and the money in", async () => {
		projectFindFirst.mockResolvedValue({
			workflow: {
				currentStep: { name: "Prototyping" },
				steps: [
					{ name: "Ideation", order: 1, done: true },
					{ name: "Prototyping", order: 4, done: false },
				],
			},
			equity: {
				platformShare: 3,
				mentorFundShare: 4,
				investmentReserve: 8,
				equityAllocations: [
					{
						id: "a1",
						percentage: 60,
						isFixed: false,
						teamMemberId: "tm1",
						owner: { id: "u1", name: "Owen" },
						promises: [{ percentage: 5 }],
					},
					// An allocation that is nothing but a promise so far.
					{
						id: "a2",
						percentage: 0,
						isFixed: false,
						teamMemberId: "tm2",
						owner: { id: "u2", name: "Mia" },
						promises: [{ percentage: 2 }],
					},
				],
			},
			team: {
				members: [
					{
						speciality: { level: "Skillful" },
						user: { profile: { timeForWork: [10, 20] } },
					},
				],
				investors: [
					{
						id: "i1",
						name: "Northgate Angels",
						comment: "Pre-seed",
						share: 5,
						value: 8000,
						currency: "USD",
					},
					{
						id: "i2",
						name: "Foundry Fund",
						comment: "Seed",
						share: 3,
						value: 4000,
						currency: "USD",
					},
					{
						id: "i3",
						name: "Ann Berg",
						comment: null,
						share: 1,
						value: 3000,
						currency: "EUR",
					},
					{
						id: "i4",
						name: "Nobody",
						comment: null,
						share: 0,
						value: 0,
						currency: "XTR",
					},
				],
				_count: { investors: 3, vacancies: 2 },
			},
		});

		const body = await (
			await call("section", { id: "p1", section: "investment" })
		).json();

		// The platform has no field for what a team asks, so the tab shows the
		// dash and the estimate beside it rather than inventing a figure.
		expect(body.stated).toBeNull();
		// Per currency, never summed across them, and a currency nobody put
		// anything into is not a row.
		expect(body.raised).toEqual([
			{ currency: "USD", amount: 12000 },
			{ currency: "EUR", amount: 3000 },
		]);
		expect(body.investorCount).toBe(3);
		// An investor with no platform account has nothing to have signed, and
		// `null` is what keeps the column from printing "Not verified" at them.
		// Numbered, never named: an investor's name is a contact a scout could
		// use to work around the author.
		expect(body.investors[0]).toEqual({ id: "i1", index: 1, share: 5 });
		// Vested and promised are separate bars, and a zero allocation
		// contributes only its promise.
		expect(body.equity.shares).toEqual([
			expect.objectContaining({ name: "Owen", percentage: 60, vested: true }),
			expect.objectContaining({ name: "Owen", percentage: 5, vested: false }),
			expect.objectContaining({ name: "Mia", percentage: 2, vested: false }),
		]);
		expect(body.estimate).toMatchObject({ teamSize: 1, openPositions: 2 });
		expect(body.estimate.remaining).toBeGreaterThan(0);
	});

	it("lists the team without contacts or per-head equity", async () => {
		projectFindFirst.mockResolvedValue({
			team: {
				members: [
					{
						id: "tm1",
						position: "Creative Director",
						status: "Founder",
						startedAt: new Date("2026-03-10"),
						finishedAt: null,
						user: {
							id: "u1",
							name: "Owen",
							image: null,
							profile: { timeForWork: [30, 40] },
						},
						speciality: { name: "Game Design", level: "Expert" },
					},
					{
						id: "tm2",
						position: "Composer",
						status: "Hired",
						startedAt: new Date("2026-06-01"),
						finishedAt: new Date("2026-08-01"),
						user: {
							id: "u2",
							name: "Mia",
							image: null,
							profile: null,
						},
						speciality: { name: "Music", level: "Skillful" },
					},
				],
			},
		});

		const body = await (
			await call("section", { id: "p1", section: "team" })
		).json();

		// A bare array, like every other section — no envelope, no investors:
		// those are read on the Investment tab, beside the money they put in.
		expect(Array.isArray(body)).toBe(true);
		// Neither a member's inbox nor their slice: a scout must go through the
		// author, and the cap table is one picture on the Investment tab.
		expect(body[0]).not.toHaveProperty("email");
		expect(body[0]).not.toHaveProperty("share");
		// Identity verification is not built, so nothing is read for it.
		expect(body[0]).not.toHaveProperty("signedLegal");
		// People who have left are listed too — a team of four that has been
		// through eleven reads differently from one that grew to four — and the
		// row carries the date that says which is which.
		expect(body[1].finishedAt).not.toBeNull();
	});

	it("lists everyone who was on the team, not only who is on it today", async () => {
		projectFindFirst.mockResolvedValue({ team: { members: [] } });

		await call("section", { id: "p1", section: "team" });

		// The first call is the visibility guard; the team read is the next one.
		const lastCall = projectFindFirst.mock.calls.at(-1);
		if (!lastCall) throw new Error("projectFindFirst was never called");
		const { where, orderBy } = lastCall[0].select.team.select.members;

		// `CONFIRMED_MEMBERS` also pins `finishedAt: null`, which would drop
		// every departed member from the table.
		expect(where).not.toHaveProperty("finishedAt");
		// Postgres sorts NULLs last on ASC, and a null `finishedAt` is the
		// person still on the team.
		expect(orderBy[0]).toEqual({
			finishedAt: { sort: "asc", nulls: "first" },
		});
	});
});

describe("how a stage was closed (GDHUB-37)", () => {
	it("names the checkpoint verdict that let it close, or its own tasks", async () => {
		const { getProjectCardWorkflow } = await import(
			"@/repositories/scout/project-card"
		);
		const step = (id: string, order: number, finishedAt: Date | null) => ({
			id,
			name: id,
			order,
			done: false,
			plannedAt: null,
			finishedAt,
		});
		workflowFindFirst.mockResolvedValue({
			currentStepId: "c",
			steps: [
				step("a", 0, new Date("2026-05-01")),
				step("b", 1, new Date("2026-09-28")),
				step("c", 2, null),
			],
		});
		// Only "Ready for the next stage" verdicts are asked for; "a" had none.
		checkpointFindMany.mockResolvedValue([
			{
				id: "cp2",
				projectId: "p1",
				createdAt: new Date("2026-09-01"),
				stepId: "b",
				curatorKind: "Human",
				curator: { name: "Patrick Novak" },
			},
		]);
		checkpointNumbers.mockResolvedValue(new Map([["cp2", 2]]));

		const steps = await getProjectCardWorkflow("p1");

		expect(steps.map((row) => row.closedBy)).toEqual([
			"tasks",
			{ number: 2, curator: "Patrick Novak" },
			null,
		]);
	});
});
