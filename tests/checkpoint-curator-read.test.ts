import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const checkpointCount = vi.fn();
const getCheckpoint = vi.fn();

vi.mock("@/auth", () => ({ auth: () => authMock() }));

// The space refuses everyone here: whoever reads, reads as the curator.
vi.mock("@/lib/space-guard", () => ({
	withSpaceGuard: () => () => async () =>
		new Response(JSON.stringify({ error: "Not found" }), { status: 404 }),
}));

vi.mock("@/repositories/checkpoint.repository", () => ({
	getCheckpoint: (...args: unknown[]) => getCheckpoint(...args),
	withProgress: <T>(checkpoint: T) => checkpoint,
	replaceCheckpointItems: vi.fn(),
}));

vi.mock("@/services/prisma", () => ({
	prisma: {
		projectCheckpoint: {
			count: (...args: unknown[]) => checkpointCount(...args),
		},
	},
}));

const read = async () => {
	const { GET } = await import("@/app/api/checkpoint/[id]/route");
	return (GET as (r: NextRequest, c: unknown) => Promise<Response>)(
		new NextRequest("http://localhost/api/checkpoint/cp1"),
		{ params: Promise.resolve({ id: "cp1" }) },
	);
};

beforeEach(() => {
	vi.clearAllMocks();
	getCheckpoint.mockResolvedValue({ id: "cp1", status: "Active" });
});

describe("reading a checkpoint", () => {
	it("lets its own curator read it without a seat in the project", async () => {
		authMock.mockResolvedValue({ user: { id: "curator", roles: ["Member"] } });
		checkpointCount.mockResolvedValue(1);

		const response = await read();
		expect(response.status).toBe(200);
		expect(checkpointCount).toHaveBeenCalledWith({
			where: { id: "cp1", curatorId: "curator" },
		});
	});

	it("sends anyone else through the project's space", async () => {
		authMock.mockResolvedValue({ user: { id: "stranger", roles: ["Member"] } });
		checkpointCount.mockResolvedValue(0);

		expect((await read()).status).toBe(404);
		expect(getCheckpoint).not.toHaveBeenCalled();
	});
});
