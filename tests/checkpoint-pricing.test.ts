import { describe, expect, it } from "vitest";
import { CHECKPOINT_AI_PRICE, curatorPrice } from "@/config/checkpoint-pricing";
import { SkillLevel } from "@/config/prisma-enums";

describe("curatorPrice", () => {
	it("follows the level, as the frame prices it", () => {
		expect(curatorPrice(SkillLevel.Expert)).toBe(375);
		expect(curatorPrice(SkillLevel.Experienced)).toBe(312);
		expect(curatorPrice(SkillLevel.Skillful)).toBe(250);
	});

	// A curator below the floor is still a curator, and the floor is what a
	// person costs at the least — never less.
	it("never goes under the floor for a junior profile", () => {
		for (const level of [SkillLevel.Novice, SkillLevel.Beginner]) {
			expect(curatorPrice(level)).toBe(curatorPrice(SkillLevel.Skillful));
		}
	});

	it("keeps the AI curator off the ladder entirely", () => {
		expect(CHECKPOINT_AI_PRICE).toBeLessThan(curatorPrice(SkillLevel.Skillful));
	});
});
