import { describe, expect, it, vi } from "vitest";
import { listClosedCheckpoints } from "@/repositories/checkpoints/checkpoint";
import { prisma } from "@/services/prisma";

vi.mock("@/services/prisma", () => ({
	prisma: { projectCheckpoint: { findMany: vi.fn(), count: vi.fn() } },
}));

const startedAt = new Date("2026-09-01T00:00:00Z");
const held = new Date("2026-09-08T14:00:00Z");

describe("the closed checkpoints of a project", () => {
	it("carry their five sessions, booked hours kept", async () => {
		vi.mocked(prisma.projectCheckpoint.findMany).mockResolvedValue([
			{
				id: "cp1",
				startedAt,
				legalAcceptances: [],
				sessions: [
					{
						index: 2,
						scheduledAt: held,
						rescheduledAt: null,
						curatorJoinedAt: held,
						endedAt: held,
						contentStatus: null,
					},
				],
			},
		] as never);
		vi.mocked(prisma.projectCheckpoint.count).mockResolvedValue(1);

		const { rows } = await listClosedCheckpoints("p1");

		expect(
			vi.mocked(prisma.projectCheckpoint.findMany).mock.calls[0][0]?.select,
		).toHaveProperty("sessions");
		expect(rows[0].sessions.map((session) => session.index)).toEqual([
			1, 2, 3, 4, 5,
		]);
		expect(rows[0].sessions[1]).toMatchObject({
			scheduledAt: held.toISOString(),
			endedAt: held.toISOString(),
		});
	});
});
