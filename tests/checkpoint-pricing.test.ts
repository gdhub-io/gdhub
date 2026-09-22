import { describe, expect, it } from "vitest";
import {
	CHECKPOINT_AI_PRICE,
	CHECKPOINT_MIN_CURATOR_PRICE,
	CURATOR_LEVELS,
	curatorPrice,
	curatorPrices,
} from "@/config/checkpoint-pricing";
import { SkillLevel } from "@/config/prisma-enums";
import { EXPERT_MIN_LEVEL, meetsSkillLevel } from "@/helpers/speciality";

describe("curator pricing", () => {
	it("prices each level at its rate for the solo author's hours", () => {
		expect(curatorPrice(SkillLevel.Expert)).toBe(450);
		expect(curatorPrice(SkillLevel.Experienced)).toBe(300);
	});

	// The landing prints a row per level against four fixed team-size columns,
	// so a short or unsorted row would quietly drop or misplace a price.
	it("prices every level for each team size, rising with the team", () => {
		for (const level of CURATOR_LEVELS) {
			const prices = curatorPrices(level);

			expect(prices).toHaveLength(4);
			expect(prices[0]).toBe(curatorPrice(level));
			expect([...prices]).toEqual([...prices].sort((a, b) => a - b));
		}

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
