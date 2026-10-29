import { CheckpointStatus } from "@gdhub-io/gdhub-prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	runningCheckpointLock,
	stageMoveApproved,
} from "@/repositories/checkpoints/workflow-lock";
import { prisma } from "@/services/prisma";

vi.mock("@/services/prisma", () => ({
	prisma: {
		projectCheckpoint: { findFirst: vi.fn(), count: vi.fn(), findMany: vi.fn() },
	},
}));

beforeEach(() => vi.clearAllMocks());

describe("a workflow edit under a running checkpoint", () => {
	it("names the running checkpoint and when it ends", async () => {
		vi.mocked(prisma.projectCheckpoint.findFirst).mockResolvedValue({
			projectId: "p1",
			createdAt: new Date("2026-10-01"),
			stageName: "Prototyping",
			dueAt: new Date("2026-10-28T00:00:00.000Z"),
		} as never);
		vi.mocked(prisma.projectCheckpoint.count).mockResolvedValue(1 as never);

		await expect(runningCheckpointLock("p1")).resolves.toEqual({
			number: 2,
			stageName: "Prototyping",
			dueAt: "2026-10-28T00:00:00.000Z",
		});
		expect(prisma.projectCheckpoint.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					projectId: "p1",
					status: { in: [CheckpointStatus.Active, CheckpointStatus.Review] },
				},
			}),
		);
	});

	it("is nothing when no checkpoint runs", async () => {
		vi.mocked(prisma.projectCheckpoint.findFirst).mockResolvedValue(null);

		await expect(runningCheckpointLock("p1")).resolves.toBeNull();
	});
});

describe("leaving a stage (GDHUB-117)", () => {
	it("moves on its tasks alone when no checkpoint ran on the stage", async () => {
		vi.mocked(prisma.projectCheckpoint.findMany).mockResolvedValue([]);
		await expect(stageMoveApproved("p1", "step1")).resolves.toBe(true);
	});

	it("waits for a verdict that approved the move once a checkpoint ran", async () => {
		vi.mocked(prisma.projectCheckpoint.findMany).mockResolvedValue([
			{ verdict: "GoalMet" },
			{ verdict: "GoalMissed" },
		] as never);
		await expect(stageMoveApproved("p1", "step1")).resolves.toBe(false);

		vi.mocked(prisma.projectCheckpoint.findMany).mockResolvedValue([
			{ verdict: "GoalMissed" },
			{ verdict: "StageClosed" },
		] as never);
		await expect(stageMoveApproved("p1", "step1")).resolves.toBe(true);
		expect(prisma.projectCheckpoint.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { projectId: "p1", stepId: "step1", verdict: { not: null } },
			}),
		);
	});
});
