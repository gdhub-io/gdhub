import { beforeEach, describe, expect, it, vi } from "vitest";
import { CURATOR_LEVELS } from "@/config/checkpoint-pricing";
import { listCheckpointCurators } from "@/repositories/checkpoints/curator-catalog";
import { prisma } from "@/services/prisma";

vi.mock("@/services/prisma", () => ({
	prisma: { speciality: { findMany: vi.fn() } },
}));

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(prisma.speciality.findMany).mockResolvedValue([] as never);
});

const whereOf = () =>
	(vi.mocked(prisma.speciality.findMany).mock.calls[0][0] as Record<string, any>)
		.where;

describe("listCheckpointCurators", () => {
	it("leaves the person asking out of their own list of curators", async () => {
		await listCheckpointCurators("u1");

		expect(whereOf().userId).toEqual({ not: "u1" });
	});

	it("still asks only for people who take mentees at a priced level", async () => {
		await listCheckpointCurators("u1");

		expect(whereOf()).toMatchObject({
			isOpenForMentoring: true,
			level: { in: CURATOR_LEVELS },
		});
	});
});
