import type { SkillLevel } from "@/config/prisma-enums";

/**
 * Who may curate a checkpoint and what they cost, in one place so both change
 * in one edit.
 *
 * A level with no price is a level nobody is offered at: running somebody
 * else's 28 days is not something you can do before you have done your own.
 * The bar happens to sit where `EXPERT_MIN_LEVEL` does today, but it is the
 * checkpoint's own rule, not the platform's mentoring one.
 *
 * A row is the curator's hourly rate times the checkpoint's hours plus the
 * platform's 25%, at the team sizes `docs/checkpoint-standard.md` §8 prices:
 * the author alone, then plus two, four and seven. Only someone who worked on
 * a released game may curate, which is checked by hand until there is a curator
 * record.
 *
 * A person carries no rate of their own yet (GDHUB-42), so their level is the
 * only thing the platform knows about what they cost; the day they do, this
 * table becomes the fallback rather than the answer. Only the solo figure is
 * charged so far — a checkout by team size is still ahead.
 */

export const CHECKPOINT_PRICE_CURRENCY = "$";

/** The AI curator has one price and it does not move with the team. */
export const CHECKPOINT_AI_PRICE = 19;

const CURATOR_PRICE = {
	Experienced: [300, 340, 380, 440],
	Expert: [450, 510, 570, 660],
} as const satisfies Partial<Record<SkillLevel, readonly number[]>>;

export type CuratorLevel = keyof typeof CURATOR_PRICE;

/** The levels a checkpoint may be given to, ready for a Prisma `in` filter. */
export const CURATOR_LEVELS = Object.keys(CURATOR_PRICE) as CuratorLevel[];

/** What this curator costs for the 28 days, at the solo author's team size. */
export const curatorPrice = (level: CuratorLevel) => CURATOR_PRICE[level][0];

/** The whole row — solo first, then the larger teams. */
export const curatorPrices = (level: CuratorLevel): readonly number[] =>
	CURATOR_PRICE[level];

/** The cheapest a person can be, which is what "from" means in the copy. */
export const CHECKPOINT_MIN_CURATOR_PRICE = Math.min(
	...CURATOR_LEVELS.map(curatorPrice),
);
