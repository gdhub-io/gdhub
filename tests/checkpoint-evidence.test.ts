import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const checkpointFindUnique = vi.fn();
const artifactFindUnique = vi.fn();
const itemUpdateMany = vi.fn();
const getCheckpoint = vi.fn();

vi.mock("@/auth", () => ({ auth: () => authMock() }));
vi.mock("next/server", async (original) => ({
	...(await original<typeof import("next/server")>()),
	after: vi.fn(),
}));
vi.mock("@/repositories/artifact-check", () => ({ checkArtifact: vi.fn() }));

// Covered by space-guard.test.ts; mocked here so the assertions are about the
// binding rather than about access resolution.
vi.mock("@/lib/space-guard", () => ({
	withSpaceGuard: () => (handler: unknown) => handler,
}));

vi.mock("@/repositories/checkpoint.repository", () => ({
	getCheckpoint: (...args: unknown[]) => getCheckpoint(...args),
	withProgress: <T>(checkpoint: T) => checkpoint,
}));

vi.mock("@/services/prisma", () => ({
	prisma: {
		projectCheckpoint: {
			findUnique: (...args: unknown[]) => checkpointFindUnique(...args),
		},
		projectArtifact: {
			findUnique: (...args: unknown[]) => artifactFindUnique(...args),
		},
		checkpointItem: {
			updateMany: (...args: unknown[]) => itemUpdateMany(...args),
		},
	},
}));

const author = { id: "u1", roles: ["Member"], onboardingDone: true };

const checkpoint = (over: Record<string, unknown> = {}) => ({
	status: "Active",
	projectId: "p1",
	items: [
		{ id: "in1", kind: "Input" },
		{ id: "out1", kind: "Outcome" },
		{ id: "out2", kind: "Outcome" },
	],
	...over,
});

const post = async (body: unknown) => {
	const { POST } = await import("@/app/api/checkpoint/[id]/evidence/route");
	const request = new NextRequest(
		"http://localhost/api/checkpoint/cp1/evidence",
		{
			method: "POST",
			body: JSON.stringify(body),
			headers: { "content-type": "application/json" },
		},
	);

	return (POST as (r: NextRequest, c: unknown) => Promise<Response>)(request, {
		params: Promise.resolve({ id: "cp1" }),
	});
};

beforeEach(() => {
	vi.clearAllMocks();
	authMock.mockResolvedValue({ user: author });
	checkpointFindUnique.mockResolvedValue(checkpoint());
	artifactFindUnique.mockResolvedValue({ projectId: "p1" });
	itemUpdateMany.mockResolvedValue({ count: 2 });
	getCheckpoint.mockResolvedValue({ id: "cp1" });
});

describe("POST /api/checkpoint/[id]/evidence", () => {
	it("writes the artifact onto every line it was offered against, and nothing else", async () => {
		const response = await post({
			artifactId: "a1",
			itemIds: ["out1", "out2"],
		});

		expect(response.status).toBe(200);
		// The whole point of the route: one column, on the rows that were ticked.
		// A goal-card replacement would take `cut`, `addedAt` and the curator's
		// note with it.
		expect(itemUpdateMany).toHaveBeenCalledWith({
			where: { id: { in: ["out1", "out2"] }, checkpointId: "cp1" },
			data: { artifactId: "a1" },
		});
	});

	it("lets an artifact go without touching the line's text", async () => {
		await post({ artifactId: null, itemIds: ["out1"] });

		expect(itemUpdateMany).toHaveBeenCalledWith({
			where: { id: { in: ["out1"] }, checkpointId: "cp1" },
			data: { artifactId: null },
		});
		expect(artifactFindUnique).not.toHaveBeenCalled();
	});

	it("refuses an input line — inputs are what the project already had", async () => {
		const response = await post({ artifactId: "a1", itemIds: ["in1"] });

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toMatchObject({
			error: "itemNotOutcome",
		});
		expect(itemUpdateMany).not.toHaveBeenCalled();
	});

	it("refuses a line belonging to another checkpoint", async () => {
		const response = await post({ artifactId: "a1", itemIds: ["someone-else"] });

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toMatchObject({
			error: "itemNotInCheckpoint",
		});
	});

	it("refuses an artifact from another project", async () => {
		artifactFindUnique.mockResolvedValue({ projectId: "p2" });

		const response = await post({ artifactId: "a1", itemIds: ["out1"] });

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toMatchObject({
			error: "artifactNotInProject",
		});
		expect(itemUpdateMany).not.toHaveBeenCalled();
	});

	it("refuses once the verdict is being written", async () => {
		checkpointFindUnique.mockResolvedValue(checkpoint({ status: "Review" }));

		const response = await post({ artifactId: "a1", itemIds: ["out1"] });

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toMatchObject({
			error: "checkpointClosed",
		});
	});
});
