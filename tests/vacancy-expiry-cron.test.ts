import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn();
const updateMany = vi.fn();
const closeVacancyChats = vi.fn();
const send = vi.fn();

vi.mock("@/auth", () => ({ auth: () => null }));
vi.mock("@/services/prisma", () => ({
	prisma: {
		teamVacancy: {
			findMany: (...args: unknown[]) => findMany(...args),
			updateMany: (...args: unknown[]) => updateMany(...args),
		},
		queueJobLog: { create: vi.fn() },
	},
}));
vi.mock("@/services/chat/vacancy-keys", () => ({
	closeVacancyChats: (...args: unknown[]) => closeVacancyChats(...args),
}));
vi.mock("@/services/novu", () => ({
	NovuService: { send: (...args: unknown[]) => send(...args) },
}));

const NOW = new Date("2026-10-02T02:00:00.000Z");
const TODAY = new Date("2026-10-02T00:00:00.000Z");
const IN_TWO_DAYS = new Date("2026-10-04T00:00:00.000Z");
const IN_THREE_DAYS = new Date("2026-10-05T00:00:00.000Z");

async function runCron() {
	const { GET } = await import("@/app/api/cron/relevant-vacancies/route");
	const req = new NextRequest("http://localhost/api/cron/relevant-vacancies", {
		headers: { authorization: "Bearer cron-secret" },
	});
	const res = await GET(req, { params: Promise.resolve({}) }, {} as never);
	return res.json();
}

describe("relevant-vacancies cron", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
		vi.stubEnv("CRON_SECRET", "cron-secret");
		vi.stubEnv("NEXT_PUBLIC_API_KEY", "public-key");
		findMany.mockReset();
		updateMany.mockReset();
		closeVacancyChats.mockReset();
		send.mockReset();
	});

	// A listing is live through its last day and closes on the next run.
	it("archives only published listings that ended before today", async () => {
		findMany
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([
			{ id: "v1", title: "Artist" },
			{ id: "v2", title: "Coder" },
		]);
		updateMany.mockResolvedValue({ count: 2 });

		const body = await runCron();

		expect(findMany.mock.calls[2][0].where).toEqual({
			status: "Published",
			finishedAt: { lt: TODAY },
		});
		expect(updateMany).toHaveBeenCalledWith({
			where: { id: { in: ["v1", "v2"] } },
			data: { status: "Closed" },
		});
		expect(closeVacancyChats.mock.calls).toEqual([["v1"], ["v2"]]);
		expect(body).toEqual({ archived: 2, reminded: 0, candidateReminders: 0 });
	});

	// Archived the day after its last one, so three days ahead of that is a
	// listing whose last day is the day after tomorrow.
	it("warns the authors three days before their listing is archived", async () => {
		findMany
			.mockResolvedValueOnce([
				{
					id: "v1",
					title: "Artist",
					publishedAt: new Date("2026-09-02T10:00:00.000Z"),
					finishedAt: new Date("2026-10-04T10:00:00.000Z"),
					_count: { applications: 2 },
					team: {
						project: { name: "Moonlit", slug: "game", author: { id: "u1", email: "a@b.c" } },
					},
				},
			])
			.mockResolvedValue([]);

		const body = await runCron();

		expect(findMany.mock.calls[0][0].where).toEqual({
			status: "Published",
			finishedAt: { gte: IN_TWO_DAYS, lt: IN_THREE_DAYS },
		});
		expect(send).toHaveBeenCalledTimes(1);
		expect(send.mock.calls[0][0]).toMatchObject({
			template: "default-message",
			to: { subscriberId: "u1", email: "a@b.c" },
			payload: {
				title: "Open position will be archived in 3 days",
				buttonText: "Go to open positions",
				redirectUrl: expect.stringMatching(
					/\/user\/project\/game\/open-positions$/,
				),
			},
		});
		expect(send.mock.calls[0][0].payload.message).toContain(
			"make a decision on the 2 candidates",
		);
		expect(updateMany).not.toHaveBeenCalled();
		expect(body).toEqual({ archived: 0, reminded: 1, candidateReminders: 0 });
	});

	// Its author picked the end date a few days ago; only the closing notice
	// is worth sending.
	it("does not warn about a listing that ran three days or less", async () => {
		findMany
			.mockResolvedValueOnce([
				{
					id: "v1",
					title: "Artist",
					publishedAt: null,
					createdAt: new Date("2026-10-01T10:00:00.000Z"),
					finishedAt: new Date("2026-10-04T10:00:00.000Z"),
					_count: { applications: 0 },
				},
			])
			.mockResolvedValue([]);

		const body = await runCron();

		expect(send).not.toHaveBeenCalled();
		expect(body).toEqual({ archived: 0, reminded: 0, candidateReminders: 0 });
	});

	// Selected by the day the candidate applied, so each cohort is reminded
	// once; listings already warned or about to be archived are left out.
	it("reminds the author of candidates undecided for a week", async () => {
		findMany
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([
				{
					id: "v1",
					title: "Artist",
					_count: { applications: 3 },
					team: {
						project: {
							name: "Moonlit",
							slug: "game",
							author: { id: "u1", email: "a@b.c" },
						},
					},
				},
			])
			.mockResolvedValue([]);

		const body = await runCron();

		expect(findMany.mock.calls[1][0].where).toEqual({
			status: "Published",
			finishedAt: { gte: TODAY },
			id: { notIn: [] },
			applications: {
				some: {
					status: "Submitted",
					createdAt: {
						gte: new Date("2026-09-24T00:00:00.000Z"),
						lt: new Date("2026-09-25T00:00:00.000Z"),
					},
				},
			},
		});
		expect(send.mock.calls[0][0].payload).toMatchObject({
			title: "Candidates are waiting for your decision",
			message: expect.stringContaining("has 3 candidates waiting"),
			buttonText: "Go to open positions",
			redirectUrl: expect.stringMatching(/\/user\/project\/game\/open-positions$/),
		});
		expect(body).toEqual({ archived: 0, reminded: 0, candidateReminders: 1 });
	});

	it("tells the author why the listing was archived", async () => {
		findMany
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([
			{
				id: "v1",
				title: "Artist",
				team: { project: { name: "Moonlit", slug: "game", author: { id: "u1", email: null } } },
			},
		]);
		updateMany.mockResolvedValue({ count: 1 });

		await runCron();

		expect(send.mock.calls[0][0].payload).toMatchObject({
			title: "Open position archived",
			message:
				'Your open position "Artist" in the project "Moonlit" was archived because the end date you set for it has passed. Its chats with candidates are closed.',
		});
	});

	it("touches nothing when no listing has ended", async () => {
		findMany.mockResolvedValue([]);

		const body = await runCron();

		expect(updateMany).not.toHaveBeenCalled();
		expect(body).toEqual({ archived: 0, reminded: 0, candidateReminders: 0 });
	});
});
