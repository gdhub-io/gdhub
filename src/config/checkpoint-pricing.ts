/**
 * What the two kinds of curator cost, for the choice on start step 3.
 *
 * These are the headline figures the step shows, not the charge. A person's
 * price is `checkpoint hours × their hourly rate + the platform's 40%`, and the
 * hours grow with the team — 7.5 for the author plus 0.5 each — so the step can
 * only say "from". The real number is computed against the chosen curator and
 * the team at the payment step.
 *
 * Sources: `docs/checkpoint-standard.md` §8 for the human floor (a Middle
 * curator, author alone), frame `vE1BQ` for the AI price.
 */

export const CHECKPOINT_PRICE_CURRENCY = "$";

/** The AI curator has one price and it does not move with the team. */
export const CHECKPOINT_AI_PRICE = 89;

/** The cheapest a person can come to: Middle level, author with no team. */
export const CHECKPOINT_HUMAN_PRICE_FROM = 250;
