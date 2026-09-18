import { CheckpointStatus } from "@gdhub-io/gdhub-prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listAdvisorCheckpoints } from "@/repositories/advisor-checkpoints";
import { prisma } from "@/services/prisma";

vi.mock("@/services/prisma", () => ({
	prisma: { projectCheckpoint: { findMany: vi.fn() } },
}));

const row = (
	id: string,
	status: CheckpointStatus,
	startedAt: Date | null = new Date("2026-09-01T00:00:00.000Z"),
) => ({
	id,
	order: 1,
	stageName: "Prototyping",
	status,
	goal: "A playable slice",
	startedAt,
	dueAt: new Date("2026-09-28T00:00:00.000Z"),
	verdict: null,
	decidedAt: null,
	project: { name: "Tide", slug: "tide", coverImage: null },
});

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(prisma.projectCheckpoint.findMany).mockResolvedValue([] as never);
});

describe("an advisor's checkpoints", () => {
	// A curator is not a member of the projects they curate, so this `where` is
	// the entire boundary: without it the board would be everybody's.
	it("asks only for the checkpoints handed to this curator", async () => {
		await listAdvisorCheckpoints("u1");

		const [args] = vi.mocked(prisma.projectCheckpoint.findMany).mock.calls[0];

		expect((args as Record<string, any>).where.curatorId).toBe("u1");
	});

	it("splits them into what is asked, running and closed", async () => {
		vi.mocked(prisma.projectCheckpoint.findMany).mockResolvedValue([
			row("a", CheckpointStatus.AwaitingCurator, null),
			row("b", CheckpointStatus.Active),
			row("c", CheckpointStatus.Review),
			row("d", CheckpointStatus.Closed),
		] as never);

		const board = await listAdvisorCheckpoints("u1");

		expect(board.asked.map((one) => one.id)).toEqual(["a"]);
		// Awaiting a verdict is still the curator's to finish, so it sits with
		// the running ones rather than with the decided.
		expect(board.running.map((one) => one.id)).toEqual(["b", "c"]);
		expect(board.closed.map((one) => one.id)).toEqual(["d"]);
	});

	// The date exists from the moment the author picks it, so counting from it
	// before anyone accepted would put "day 12" on a checkpoint nobody started.
	it("counts no day for a checkpoint still waiting on its curator", async () => {
		vi.mocked(prisma.projectCheckpoint.findMany).mockResolvedValue([
			row("a", CheckpointStatus.AwaitingCurator),
			row("b", CheckpointStatus.Active),
		] as never);

		const board = await listAdvisorCheckpoints("u1");

		expect(board.asked[0].day).toBeNull();
		expect(board.running[0].day).not.toBeNull();
	});
});
