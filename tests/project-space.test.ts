import { describe, expect, it, vi } from "vitest";
import { prisma } from "../src/services/prisma";

vi.mock("../src/services/prisma", () => ({
	prisma: { project: { findFirst: vi.fn() } },
}));

import { SpaceRole } from "../src/config/permissions/roles";
import { projectSpaceAdapter } from "../src/repositories/project/space";

describe("projectSpaceAdapter", () => {
	it("reads only the rows that hold a place on the team", async () => {
		// A member fired and taken back has both rows; the Fired one came first.
		vi.mocked(prisma.project.findFirst).mockResolvedValue({
			id: "p1",
			authorId: "author",
			team: { members: [{ status: "Hired" }] },
		} as never);

		const access = await projectSpaceAdapter.resolve?.("slug", {
			id: "u1",
		} as never);

		const where = vi.mocked(prisma.project.findFirst).mock.calls[0][0]?.select
			?.team as { select: { members: { where: unknown } } };
		// Still on the team today: a finished row no longer grants a role.
		expect(where.select.members.where).toEqual({
			userId: "u1",
			status: { in: ["Hired", "Founder"] },
			finishedAt: null,
		});
		expect(access?.role).toBe(SpaceRole.Member);
	});
});
