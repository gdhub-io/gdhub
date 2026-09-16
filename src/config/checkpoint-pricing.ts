import { SkillLevel } from "@/config/prisma-enums";

/**
 * What a checkpoint costs, in one place so it can be changed in one place.
 *
 * A person's price follows their level, which is the only thing the platform
 * knows about how expensive they are: `Speciality` carries no rate of its own
 * (GDHUB-42). The figures come from frame `eFLO0`, and the day a curator does
 * carry a rate, this table becomes its fallback rather than the answer.
 *
 * Nothing here is charged yet — Stripe checkout is GDHUB-38.
 */

export const CHECKPOINT_PRICE_CURRENCY = "$";

/** The AI curator has one price and it does not move with the team. */
export const CHECKPOINT_AI_PRICE = 19;

/**
 * Below `Skillful` the floor holds: a curator is never sold for less than the
 * cheapest a person can be, however junior the profile says they are.
 */
const CURATOR_PRICE: Record<SkillLevel, number> = {
	[SkillLevel.Novice]: 250,
	[SkillLevel.Beginner]: 250,
	[SkillLevel.Skillful]: 250,
	[SkillLevel.Experienced]: 312,
	[SkillLevel.Expert]: 375,
};

/** What this curator costs for the 28 days. */
export const curatorPrice = (level: SkillLevel) => CURATOR_PRICE[level];
