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
 * The figures come from frame `eFLO0`. A person carries no rate of their own
 * yet (GDHUB-42), so their level is the only thing the platform knows about
 * what they cost; the day they do, this table becomes the fallback rather than
 * the answer. Nothing here is charged — Stripe checkout is GDHUB-38.
 */

export const CHECKPOINT_PRICE_CURRENCY = "$";

/** The AI curator has one price and it does not move with the team. */
export const CHECKPOINT_AI_PRICE = 19;

const CURATOR_PRICE = {
	Experienced: 312,
	Expert: 375,
} as const satisfies Partial<Record<SkillLevel, number>>;

export type CuratorLevel = keyof typeof CURATOR_PRICE;

/** The levels a checkpoint may be given to, ready for a Prisma `in` filter. */
export const CURATOR_LEVELS = Object.keys(CURATOR_PRICE) as CuratorLevel[];

/** What this curator costs for the 28 days. */
export const curatorPrice = (level: CuratorLevel) => CURATOR_PRICE[level];
