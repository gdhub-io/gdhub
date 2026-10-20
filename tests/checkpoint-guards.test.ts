import { CheckpointStatus } from "@gdhub-io/gdhub-prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { runningCheckpointLock } from "@/repositories/checkpoint-guards";
import { prisma } from "@/services/prisma";

vi.mock("@/services/prisma", () => ({
	prisma: { projectCheckpoint: { findFirst: vi.fn(), count: vi.fn() } },
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
