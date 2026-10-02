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
const TOMORROW = new Date("2026-10-03T00:00:00.000Z");

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

	// A listing that ends today is warned, not archived: closing it in the same
	// run would leave its author no time to extend it.
	it("archives only published listings that ended before today", async () => {
		findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([
			{ id: "v1", title: "Artist" },
			{ id: "v2", title: "Coder" },
		]);
		updateMany.mockResolvedValue({ count: 2 });

		const body = await runCron();

		expect(findMany.mock.calls[1][0].where).toEqual({
			status: "Published",
			finishedAt: { lt: TODAY },
		});
		expect(updateMany).toHaveBeenCalledWith({
			where: { id: { in: ["v1", "v2"] } },
			data: { status: "Closed" },
		});
		expect(closeVacancyChats.mock.calls).toEqual([["v1"], ["v2"]]);
		expect(body).toEqual({ archived: 2, reminded: 0 });
	});

	it("warns the authors of listings that end today, a run before archiving", async () => {
		findMany
			.mockResolvedValueOnce([
				{
					id: "v1",
					title: "Artist",
					publishedAt: new Date("2026-09-02T10:00:00.000Z"),
					finishedAt: new Date("2026-10-02T10:00:00.000Z"),
					_count: { applicants: 2 },
					team: {
						project: { slug: "game", author: { id: "u1", email: "a@b.c" } },
					},
				},
			])
			.mockResolvedValueOnce([]);

		const body = await runCron();

		expect(findMany.mock.calls[0][0].where).toEqual({
			status: "Published",
			finishedAt: { gte: TODAY, lt: TOMORROW },
		});
		expect(send).toHaveBeenCalledTimes(1);
		expect(send.mock.calls[0][0]).toMatchObject({
			template: "default-message",
			to: { subscriberId: "u1", email: "a@b.c" },
			payload: { title: "Vacancy will be archived tomorrow" },
		});
		expect(send.mock.calls[0][0].payload.message).toContain(
			"make a decision on the 2 candidates",
		);
		expect(updateMany).not.toHaveBeenCalled();
		expect(body).toEqual({ archived: 0, reminded: 1 });
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
					createdAt: new Date("2026-09-29T10:00:00.000Z"),
					finishedAt: new Date("2026-10-02T10:00:00.000Z"),
					_count: { applicants: 0 },
				},
			])
			.mockResolvedValueOnce([]);

		const body = await runCron();

		expect(send).not.toHaveBeenCalled();
		expect(body).toEqual({ archived: 0, reminded: 0 });
	});

	it("tells the author why the listing was archived", async () => {
		findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([
			{
				id: "v1",
				title: "Artist",
				team: { project: { slug: "game", author: { id: "u1", email: null } } },
			},
		]);
		updateMany.mockResolvedValue({ count: 1 });

		await runCron();

		expect(send.mock.calls[0][0].payload).toMatchObject({
			title: "Vacancy archived",
			message: expect.stringContaining("the end date you set for it has passed"),
		});
	});

	it("touches nothing when no listing has ended", async () => {
		findMany.mockResolvedValue([]);

		const body = await runCron();

		expect(updateMany).not.toHaveBeenCalled();
		expect(body).toEqual({ archived: 0, reminded: 0 });
	});
});
