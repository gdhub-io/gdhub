import { describe, expect, it } from "vitest";
import { CALL_MAX_PARTICIPANTS, CHECKPOINT_AI_PRICE, CHECKPOINT_MAX_TEAM } from "@/config/checkpoint";
import { CHECKPOINT_MIN_CURATOR_PRICE, CURATOR_LEVELS, curatorPrice } from "@/config/checkpoint-pricing";
import { SkillLevel } from "@/config/prisma-enums";
import { EXPERT_MIN_LEVEL, meetsSkillLevel } from "@/helpers/speciality";

describe("curator pricing", () => {
	it("prices each level at one figure", () => {
		expect(curatorPrice(SkillLevel.Expert)).toBe(450);
		expect(curatorPrice(SkillLevel.Experienced)).toBe(300);
	});

	it("prices any team up to the cap the same, and seats all of it on a call", () => {
		expect(CHECKPOINT_MAX_TEAM).toBe(10);
		expect(CALL_MAX_PARTICIPANTS).toBe(CHECKPOINT_MAX_TEAM + 1);
		expect(CHECKPOINT_MIN_CURATOR_PRICE).toBe(
			Math.min(...CURATOR_LEVELS.map(curatorPrice)),
		);
	});

	// The list and the price table are the same table: a level nobody may be
	// offered at has no price, and a level with a price is offered.
	it("offers nobody below the level the platform calls expert", () => {
		expect(CURATOR_LEVELS.length).toBeGreaterThan(0);

		for (const level of CURATOR_LEVELS) {
			expect(meetsSkillLevel(level, EXPERT_MIN_LEVEL)).toBe(true);
		}

		for (const level of [
			SkillLevel.Novice,
			SkillLevel.Beginner,
			SkillLevel.Skillful,
		]) {
			expect(CURATOR_LEVELS).not.toContain(level);
		}
	});

	it("keeps the AI curator off the ladder entirely", () => {
		expect(CHECKPOINT_AI_PRICE).toBeLessThan(
			curatorPrice(SkillLevel.Experienced),
		);
	});
});
