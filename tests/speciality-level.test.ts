import { SkillLevel, UserRole } from "@gdhub-io/gdhub-prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";

const specialityCount = vi.fn();
const specialityFindMany = vi.fn();

vi.mock("@/services/prisma", () => ({
	prisma: {
		speciality: {
			count: (...args: unknown[]) => specialityCount(...args),
			findMany: (...args: unknown[]) => specialityFindMany(...args),
		},
	},
}));

import {
	EXPERT_SKILL_LEVELS,
	meetsSkillLevel,
	SKILL_LEVEL_ORDER,
	skillLevelRank,
	skillLevelsAtLeast,
} from "@/helpers/speciality";
import { hubSpaceAdapter } from "@/repositories/hub/space";
import {
	getQualifiedDirectionIds,
	hasQualifiedSpeciality,
} from "@/repositories/user/speciality";

beforeEach(() => {
	specialityCount.mockReset();
	specialityFindMany.mockReset();
});

describe("skill level ladder", () => {
	it("orders the levels weakest to strongest", () => {
		expect([...SKILL_LEVEL_ORDER]).toEqual([
			SkillLevel.Novice,
			SkillLevel.Beginner,
			SkillLevel.Skillful,
			SkillLevel.Experienced,
			SkillLevel.Expert,
		]);
	});

	it("covers every level the schema defines", () => {
		expect([...SKILL_LEVEL_ORDER].sort()).toEqual(
			Object.values(SkillLevel).sort(),
		);
	});

	it("treats a value that is not a level as unranked", () => {
		expect(skillLevelRank("Wizard")).toBe(-1);
		expect(skillLevelRank(null)).toBe(-1);
		expect(meetsSkillLevel(null, SkillLevel.Novice)).toBe(false);
	});

	it("compares levels by rank, not by name", () => {
		expect(meetsSkillLevel(SkillLevel.Expert, SkillLevel.Experienced)).toBe(
			true,
		);
		expect(meetsSkillLevel(SkillLevel.Experienced, SkillLevel.Experienced)).toBe(
			true,
		);
		expect(meetsSkillLevel(SkillLevel.Skillful, SkillLevel.Experienced)).toBe(
			false,
		);
	});

	it("expands a threshold into the levels above it", () => {
		expect(skillLevelsAtLeast(SkillLevel.Experienced)).toEqual([
			SkillLevel.Experienced,
			SkillLevel.Expert,
		]);
		expect(skillLevelsAtLeast(SkillLevel.Novice)).toHaveLength(5);
		expect(EXPERT_SKILL_LEVELS).toEqual([
			SkillLevel.Experienced,
			SkillLevel.Expert,
		]);
	});
});

describe("speciality repository", () => {
	it("returns each qualifying direction once", async () => {
		specialityFindMany.mockResolvedValue([
			{ workDirectionId: "d-art" },
			{ workDirectionId: "d-code" },
		]);

		await expect(getQualifiedDirectionIds("u1")).resolves.toEqual([
			"d-art",
			"d-code",
		]);

		const where = specialityFindMany.mock.calls[0][0].where;
		expect(where).toMatchObject({ userId: "u1" });
		expect(where.level.in).toEqual(EXPERT_SKILL_LEVELS);
	});

	it("defaults to the expert threshold and narrows to one direction", async () => {
		specialityCount.mockResolvedValue(1);

		await expect(
			hasQualifiedSpeciality("u1", { directionId: "d-art" }),
		).resolves.toBe(true);

		expect(specialityCount.mock.calls[0][0].where).toMatchObject({
			userId: "u1",
			workDirectionId: "d-art",
			level: { in: EXPERT_SKILL_LEVELS },
		});
	});

	it("honours a lower threshold when one is asked for", async () => {
		specialityCount.mockResolvedValue(0);

		await expect(
			hasQualifiedSpeciality("u1", { minLevel: SkillLevel.Skillful }),
		).resolves.toBe(false);

		expect(specialityCount.mock.calls[0][0].where.level.in).toEqual([
			SkillLevel.Skillful,
			SkillLevel.Experienced,
			SkillLevel.Expert,
		]);
	});
});

describe("hub adapter — the speciality rule as a revoke", () => {
	const member = {
		id: "u-member",
		roles: [UserRole.Member],
		onboardingDone: true,
	};

	it("takes event creation away from a member with no qualifying speciality", async () => {
		specialityCount.mockResolvedValue(0);

		await expect(hubSpaceAdapter.revoked?.("default", member)).resolves.toEqual(
			["hub.events.create"],
		);
	});

	it("leaves it in place once the member qualifies", async () => {
		specialityCount.mockResolvedValue(1);

		await expect(hubSpaceAdapter.revoked?.("default", member)).resolves.toEqual(
			[],
		);
	});

	it("never revokes anything else — state may only take away what it names", async () => {
		specialityCount.mockResolvedValue(0);

		const revoked = (await hubSpaceAdapter.revoked?.("default", member)) ?? [];
		expect(revoked.some((pattern) => pattern.startsWith("*."))).toBe(false);
	});

	it("exempts staff, who organise on the platform's behalf", async () => {
		const staff = { id: "u-staff", roles: [UserRole.Admin], onboardingDone: true };

		await expect(hubSpaceAdapter.revoked?.("default", staff)).resolves.toEqual(
			[],
		);
		expect(specialityCount).not.toHaveBeenCalled();
	});
});
