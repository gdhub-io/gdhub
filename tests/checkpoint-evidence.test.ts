import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const checkpointFindUnique = vi.fn();
const artifactFindUnique = vi.fn();
const evidenceCreateMany = vi.fn();
const evidenceDeleteMany = vi.fn();
const getCheckpoint = vi.fn();

vi.mock("@/auth", () => ({ auth: () => authMock() }));
vi.mock("next/server", async (original) => ({
	...(await original<typeof import("next/server")>()),
	after: vi.fn(),
}));
vi.mock("@/repositories/project/artifact-check", () => ({ checkArtifact: vi.fn() }));

// Covered by space-guard.test.ts; mocked here so the assertions are about the
// binding rather than about access resolution.
vi.mock("@/lib/space-guard", () => ({
	withSpaceGuard: () => (handler: unknown) => handler,
}));

vi.mock("@/repositories/checkpoints/checkpoint", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/repositories/checkpoints/checkpoint")>()),
	withProgress: <T>(checkpoint: T) => checkpoint,
}));
vi.mock("@/repositories/checkpoints/detail", () => ({
	getCheckpoint: (...args: unknown[]) => getCheckpoint(...args),
}));

vi.mock("@/services/prisma", () => ({
	prisma: {
		projectCheckpoint: {
			findUnique: (...args: unknown[]) => checkpointFindUnique(...args),
		},
		projectArtifact: {
			findUnique: (...args: unknown[]) => artifactFindUnique(...args),
		},
		checkpointItemEvidence: {
			createMany: (...args: unknown[]) => evidenceCreateMany(...args),
			deleteMany: (...args: unknown[]) => evidenceDeleteMany(...args),
		},
	},
}));

const author = { id: "u1", roles: ["Member"], onboardingDone: true };

const checkpoint = (over: Record<string, unknown> = {}) => ({
	status: "Active",
	projectId: "p1",
	items: [
		{ id: "in1", kind: "Input", evidence: [] },
		{ id: "out1", kind: "Outcome", evidence: [] },
		{ id: "out2", kind: "Outcome", evidence: [] },
	],
	...over,
});

const call = async (method: "POST" | "DELETE", body: unknown) => {
	const route = await import("@/app/api/checkpoint/[id]/evidence/route");
	const request = new NextRequest(
		"http://localhost/api/checkpoint/cp1/evidence",
		{
			method,
			body: JSON.stringify(body),
			headers: { "content-type": "application/json" },
		},
	);

	return (route[method] as (r: NextRequest, c: unknown) => Promise<Response>)(
		request,
		{ params: Promise.resolve({ id: "cp1" }) },
	);
};

const post = (body: unknown) => call("POST", body);
const remove = (body: unknown) => call("DELETE", body);

const full = (ids: string[]) => ids.map((artifactId) => ({ artifactId }));

beforeEach(() => {
	vi.clearAllMocks();
	authMock.mockResolvedValue({ user: author });
	checkpointFindUnique.mockResolvedValue(checkpoint());
	artifactFindUnique.mockResolvedValue({ projectId: "p1" });
	evidenceCreateMany.mockResolvedValue({ count: 2 });
	evidenceDeleteMany.mockResolvedValue({ count: 1 });
	getCheckpoint.mockResolvedValue({ id: "cp1" });
});

describe("POST /api/checkpoint/[id]/evidence", () => {
	it("writes the artifact onto every line it was offered against, and nothing else", async () => {
		const response = await post({
			artifactId: "a1",
			itemIds: ["out1", "out2"],
		});

		expect(response.status).toBe(200);
		// The whole point of the route: evidence rows on the lines that were
		// ticked, the lines themselves untouched. A goal-card replacement would
		// take `cut`, `addedAt` and the curator's note with it.
		expect(evidenceCreateMany).toHaveBeenCalledWith({
			data: [
				{ itemId: "out1", artifactId: "a1" },
				{ itemId: "out2", artifactId: "a1" },
			],
			skipDuplicates: true,
		});
		expect(evidenceDeleteMany).not.toHaveBeenCalled();
	});

	it("refuses a fourth artifact on a task that already holds three", async () => {
		checkpointFindUnique.mockResolvedValue(
			checkpoint({
				items: [
					{ id: "out1", kind: "Outcome", evidence: full(["a1", "a2", "a3"]) },
					{ id: "out2", kind: "Outcome", evidence: [] },
				],
			}),
		);

		const response = await post({
			artifactId: "a4",
			itemIds: ["out1", "out2"],
		});

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toMatchObject({
			error: "evidenceFull",
		});
		// Refused whole: the free task does not get it either.
		expect(evidenceCreateMany).not.toHaveBeenCalled();
	});

	it("lets an artifact already on a full task be offered again, as a no-op there", async () => {
		checkpointFindUnique.mockResolvedValue(
			checkpoint({
				items: [
					{ id: "out1", kind: "Outcome", evidence: full(["a1", "a2", "a3"]) },
				],
			}),
		);

		const response = await post({ artifactId: "a2", itemIds: ["out1"] });

		expect(response.status).toBe(200);
		expect(evidenceCreateMany).toHaveBeenCalledWith({
			data: [{ itemId: "out1", artifactId: "a2" }],
			skipDuplicates: true,
		});
	});

	it("refuses an input line — inputs are what the project already had", async () => {
		const response = await post({ artifactId: "a1", itemIds: ["in1"] });

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toMatchObject({
			error: "itemNotOutcome",
		});
		expect(evidenceCreateMany).not.toHaveBeenCalled();
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
		expect(evidenceCreateMany).not.toHaveBeenCalled();
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

describe("DELETE /api/checkpoint/[id]/evidence", () => {
	it("lets one artifact go from one task without touching the line's text", async () => {
		const response = await remove({ artifactId: "a1", itemId: "out1" });

		expect(response.status).toBe(200);
		expect(evidenceDeleteMany).toHaveBeenCalledWith({
			where: { itemId: "out1", artifactId: "a1" },
		});
		expect(evidenceCreateMany).not.toHaveBeenCalled();
		expect(artifactFindUnique).not.toHaveBeenCalled();
	});

	it("refuses once the verdict is being written", async () => {
		checkpointFindUnique.mockResolvedValue(checkpoint({ status: "Review" }));

		const response = await remove({ artifactId: "a1", itemId: "out1" });

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toMatchObject({
			error: "checkpointClosed",
		});
		expect(evidenceDeleteMany).not.toHaveBeenCalled();
	});

	it("refuses an input line", async () => {
		const response = await remove({ artifactId: "a1", itemId: "in1" });

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toMatchObject({
			error: "itemNotOutcome",
		});
		expect(evidenceDeleteMany).not.toHaveBeenCalled();
	});

	it("refuses a line belonging to another checkpoint", async () => {
		const response = await remove({ artifactId: "a1", itemId: "someone-else" });

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toMatchObject({
			error: "itemNotInCheckpoint",
		});
		expect(evidenceDeleteMany).not.toHaveBeenCalled();
	});
});
