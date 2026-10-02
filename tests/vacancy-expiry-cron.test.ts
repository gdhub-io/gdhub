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

	// A listing that ends later today is still live: the cutoff is the moment
	// of the run, not the end of the day.
	it("archives only published listings that have already ended", async () => {
		findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([
			{ id: "v1", title: "Artist" },
			{ id: "v2", title: "Coder" },
		]);
		updateMany.mockResolvedValue({ count: 2 });

		const body = await runCron();

		expect(findMany.mock.calls[1][0].where).toEqual({
			status: "Published",
			finishedAt: { lt: NOW },
		});
		expect(updateMany).toHaveBeenCalledWith({
			where: { id: { in: ["v1", "v2"] } },
			data: { status: "Closed" },
		});
		expect(closeVacancyChats.mock.calls).toEqual([["v1"], ["v2"]]);
		expect(body).toEqual({ archived: 2, reminded: 0 });
	});

	it("touches nothing when no listing has ended", async () => {
		findMany.mockResolvedValue([]);

		const body = await runCron();

		expect(updateMany).not.toHaveBeenCalled();
		expect(body).toEqual({ archived: 0, reminded: 0 });
	});
});
