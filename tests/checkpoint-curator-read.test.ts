import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const findCheckpoint = vi.fn();
const getCheckpoint = vi.fn();

vi.mock("@/auth", () => ({ auth: () => authMock() }));

// The space refuses everyone here: whoever reads, reads as the checkpoint's own.
vi.mock("@/lib/space-guard", () => ({
	withSpaceGuard: () => () => async () =>
		new Response(JSON.stringify({ error: "Not found" }), { status: 404 }),
}));

vi.mock("@/repositories/checkpoints/checkpoint", () => ({
	getCheckpoint: (...args: unknown[]) => getCheckpoint(...args),
	withProgress: <T>(checkpoint: T) => checkpoint,
	replaceCheckpointItems: vi.fn(),
}));

vi.mock("@/services/prisma", () => ({
	prisma: {
		projectCheckpoint: {
			findUnique: (...args: unknown[]) => findCheckpoint(...args),
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

const row = (members: unknown[] = []) => ({
	curatorId: "curator",
	project: { authorId: "author", team: { members } },
});

describe("reading a checkpoint", () => {
	it.each([
		["its curator, without a seat in the project", "curator", row()],
		["its author", "author", row()],
		["someone confirmed on the team", "member", row([{ id: "tm1" }])],
	])("lets %s read it", async (_, id, found) => {
		authMock.mockResolvedValue({ user: { id, roles: ["Member"] } });
		findCheckpoint.mockResolvedValue(found);

		expect((await read()).status).toBe(200);
	});

	it("sends anyone else through the project's space", async () => {
		authMock.mockResolvedValue({ user: { id: "stranger", roles: ["Member"] } });
		findCheckpoint.mockResolvedValue(row());

		expect((await read()).status).toBe(404);
		expect(getCheckpoint).not.toHaveBeenCalled();
	});
});
