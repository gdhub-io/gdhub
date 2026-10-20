import {
	CHECKPOINT_MINOR_UNITS,
	CHECKPOINT_PRICE_CURRENCY,
	CURATOR_PRICE,
} from "@/config/checkpoint";

/**
 * Who may curate a checkpoint and what they cost, in one place so both change
 * in one edit.
 *
 * A level with no price is a level nobody is offered at: running somebody
 * else's 28 days is not something you can do before you have done your own.
 * The bar happens to sit where `EXPERT_MIN_LEVEL` does today, but it is the
 * checkpoint's own rule, not the platform's mentoring one.
 *
 * One price per level, whatever the team up to `CHECKPOINT_MAX_TEAM`
 * (`docs/checkpoint-standard.md` §8). Only someone who worked on a released game
 * may curate, which is checked by hand until there is a curator record.
 *
 * A person carries no rate of their own yet (GDHUB-42), so their level is the
 * only thing the platform knows about what they cost; the day they do, this
 * table becomes the fallback rather than the answer.
 */

export type CuratorLevel = keyof typeof CURATOR_PRICE;

/** The levels a checkpoint may be given to, ready for a Prisma `in` filter. */
export const CURATOR_LEVELS = Object.keys(CURATOR_PRICE) as CuratorLevel[];

/** What this curator costs for the 28 days. */
export const curatorPrice = (level: CuratorLevel) => CURATOR_PRICE[level];

/** The cheapest a person can be, which is what "from" means in the copy. */
export const CHECKPOINT_MIN_CURATOR_PRICE = Math.min(
	...CURATOR_LEVELS.map(curatorPrice),
);

/** Server-only: whether a new checkpoint can be bought at all. */
export const checkpointPurchaseOpen = () =>
	process.env.CHECKPOINTS_PURCHASE_OPEN === "true";

/** A sum in minor units as the screens write it: "$450", "$1,832.30". */
export const formatCheckpointMoney = (minor: number) => {
	const whole = minor / CHECKPOINT_MINOR_UNITS;
	const digits = Number.isInteger(whole) ? 0 : 2;

	return `${CHECKPOINT_PRICE_CURRENCY}${whole.toLocaleString("en-US", {
		minimumFractionDigits: digits,
		maximumFractionDigits: digits,
	})}`;
};

const money = (minor: number, digits: number) =>
	`${CHECKPOINT_PRICE_CURRENCY}${(
		minor / CHECKPOINT_MINOR_UNITS
	).toLocaleString("en-US", {
		minimumFractionDigits: digits,
		maximumFractionDigits: digits,
	})}`;

/** Always to the cent: a fee or a payout is what goes into the bank form, a running cost is fractions of one. */
export const formatMoneyCents = (minor: number) => money(Math.round(minor), 2);

/** Rounded to the dollar, for a legend too narrow for cents. */
export const formatMoneyWhole = (minor: number) =>
	money(Math.round(minor / CHECKPOINT_MINOR_UNITS) * CHECKPOINT_MINOR_UNITS, 0);

/** A sum that can go below zero, with a real minus. */
export const signedMoney = (minor: number, format = formatCheckpointMoney) =>
	`${minor < 0 ? "−" : ""}${format(Math.abs(Math.round(minor)))}`;

/** Money going out reads at a glance as a minus; nothing out is written plain. */
export const moneyOut = (minor: number, format = formatCheckpointMoney) =>
	signedMoney(-minor, format);
