import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const checkpointFind = vi.fn();
const getProjectActivity = vi.fn(async () => ({ events: [], next: null }));

vi.mock("@/auth", () => ({ auth: () => authMock() }));
vi.mock("@/services/prisma", () => ({
	prisma: {
		projectCheckpoint: { findUnique: (...a: unknown[]) => checkpointFind(...a) },
	},
}));
vi.mock("@/repositories/project-activity.repository", () => ({
	getProjectActivity: (...a: unknown[]) => getProjectActivity(...(a as [])),
}));

const { GET } = await import("@/app/api/checkpoint/[id]/activity/route");

const checkpoint = (curatorId: string) => ({
	projectId: "p1",
	curatorId,
	project: { authorId: "author", team: { members: [] } },
});
const get = () =>
	GET(
		new NextRequest("http://localhost/api/checkpoint/cp1/activity"),
		{ params: Promise.resolve({ id: "cp1" }) },
		{},
	);

beforeEach(() => {
	vi.clearAllMocks();
	authMock.mockResolvedValue({ user: { id: "curator" } });
});

describe("GET /api/checkpoint/[id]/activity", () => {
	it("lets the checkpoint's curator read the project's activity", async () => {
		checkpointFind.mockResolvedValue(checkpoint("curator"));
		expect((await get()).status).toBe(200);
		expect(getProjectActivity).toHaveBeenCalledWith("p1", expect.anything());
	});

	it("refuses anyone the checkpoint is nothing to", async () => {
		checkpointFind.mockResolvedValue(checkpoint("someone-else"));
		expect((await get()).status).toBe(403);
		expect(getProjectActivity).not.toHaveBeenCalled();
	});
});
