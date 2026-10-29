import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.fn();
vi.mock("@/services/prisma", () => ({ prisma: { teamMember: { findFirst } } }));

const { currentMembership } = await import("@/repositories/project/team");

beforeEach(() => vi.clearAllMocks());

describe("currentMembership", () => {
	it("reads a place held today, the newest row first", async () => {
		await currentMembership("u1", { teamId: "t1" });

		expect(findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					status: { in: ["Hired", "Founder"] },
					finishedAt: null,
					userId: "u1",
					teamId: "t1",
				},
				// A user fired and taken back has a Fired row beside the new one.
				orderBy: { startedAt: "desc" },
			}),
		);
	});

	it("finds the team through its project", async () => {
		await currentMembership("u1", { projectId: "p1" });

		expect(findFirst.mock.calls[0][0].where).toMatchObject({
			team: { projectId: "p1" },
		});
		expect(findFirst.mock.calls[0][0].where).not.toHaveProperty("teamId");
	});
});
