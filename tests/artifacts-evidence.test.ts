import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const artifactFindMany = vi.fn();
const checkpointFindMany = vi.fn();

vi.mock("@/auth", () => ({ auth: () => authMock() }));
vi.mock("@/lib/space-guard", () => ({
	withSpaceGuard: () => (handler: unknown) => handler,
}));
vi.mock("@/repositories/evidence-seen", () => ({ checkAndLook: vi.fn() }));
vi.mock("@/services/prisma", () => ({
	prisma: {
		projectArtifact: { findMany: (...a: unknown[]) => artifactFindMany(...a) },
		projectCheckpoint: {
			findMany: (...a: unknown[]) => checkpointFindMany(...a),
		},
	},
}));

const get = async () => {
	const { GET } = await import("@/app/api/user/project/artifacts/route");
	return (GET as (r: NextRequest, c: unknown) => Promise<Response>)(
		new NextRequest("http://localhost/api/user/project/artifacts?projectId=p1"),
		{ params: Promise.resolve({}) },
	);
};

const created = { cp1: new Date("2026-08-01"), cp2: new Date("2026-09-01") };
const checkpoint = (id: "cp1" | "cp2") => ({
	id,
	projectId: "p1",
	createdAt: created[id],
});

beforeEach(() => {
	vi.clearAllMocks();
	authMock.mockResolvedValue({
		user: { id: "u1", roles: ["Member"], onboardingDone: true },
	});
});

describe("an artifact says which checkpoint tasks it proves (GDHUB-39)", () => {
	it("groups the tasks by checkpoint, numbered as the project's path numbers them", async () => {
		artifactFindMany.mockResolvedValue([
			{
				id: "a1",
				name: "Greybox",
				checkpointEvidence: [
					{ item: { text: "Greybox build", checkpoint: checkpoint("cp2") } },
					{ item: { text: "Five playtesters", checkpoint: checkpoint("cp2") } },
					{ item: { text: "Core loop", checkpoint: checkpoint("cp1") } },
				],
			},
			{ id: "a2", name: "Concept art", checkpointEvidence: [] },
		]);
		// The project's numbered checkpoints, as the shared numbering reads them.
		checkpointFindMany.mockResolvedValue([
			{ projectId: "p1", createdAt: created.cp1 },
			{ projectId: "p1", createdAt: created.cp2 },
		]);

		const body = await (await get()).json();

		expect(body.map((row: { evidence: unknown }) => row.evidence)).toEqual([
			[
				{ checkpointNumber: 2, tasks: ["Greybox build", "Five playtesters"] },
				{ checkpointNumber: 1, tasks: ["Core loop"] },
			],
			[],
		]);
		expect(body[0].checkpointEvidence).toBeUndefined();
	});

	it("counts only outcomes of checkpoints that ran", async () => {
		artifactFindMany.mockResolvedValue([]);

		await get();

		expect(
			artifactFindMany.mock.calls[0][0].include.checkpointEvidence.where,
		).toEqual({
			item: {
				kind: "Outcome",
				checkpoint: { status: { notIn: ["Draft", "Cancelled"] } },
			},
		});
	});
});
