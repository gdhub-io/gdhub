import { CheckpointStatus, type SkillLevel } from "@/config/prisma-enums";

/**
 * Every number a checkpoint runs on. Code that needs one imports it from here;
 * the arithmetic built on them (`sessionDay`, `dueDateFrom`, `curatorPrice`)
 * lives in `lib/` and `config/checkpoint-pricing.ts`. Browser-safe.
 */

// The 28 days

/** How long a checkpoint's days run. Not configurable — it is the product. */
export const CHECKPOINT_DAYS = 28;
export const SPRINT_DAYS = 7;
export const SPRINTS_PER_CHECKPOINT = CHECKPOINT_DAYS / SPRINT_DAYS;

/** One opening each sprint and the final one the day after the 28 days. */
export const SESSIONS_PER_CHECKPOINT = SPRINTS_PER_CHECKPOINT + 1;
export const FINAL_SESSION = SESSIONS_PER_CHECKPOINT;

/**
 * A guide, not a limit: a call may run two hours. Calendars and anything else
 * that needs an end time use it.
 */
export const SESSION_MINUTES = 45;

// The team

/**
 * A checkpoint is sold for a team of one to this many, the author included, at
 * one price. People join and leave mid-run, so a price that moved with the team
 * could not hold; a larger team asks for an offer by email instead.
 */
export const CHECKPOINT_MAX_TEAM = 10;
export const CHECKPOINT_LARGE_TEAM_EMAIL = "info@gdhub.io";

// The call room

/** The room opens this long before a call and closes this long after its start. */
export const CALL_OPENS_MINUTES = 15;
export const CALL_CLOSES_MINUTES = 180;
/** The curator and the whole team. */
export const CALL_MAX_PARTICIPANTS = CHECKPOINT_MAX_TEAM + 1;
/** How often a team waiting for the curator asks whether they have joined. */
export const CALL_WAIT_POLL_SECONDS = 5;
/** Notes wait this long after a call so every part of its recording is in. */
export const CALL_NOTES_DELAY_MINUTES = 30;

// The day-15 scope change

/** The session that revisits the outcome list. */
export const SCOPE_SESSION = 3;
export const SCOPE_ANSWER_HOURS = 24;

// The AI curator

/** With the AI curator the tasks are set on the review page, open this many days from the start. */
export const AI_PLAN_DAYS = 2;

// The verdict

/** Due by the end of this many days after `dueAt`, the 28th day. */
export const VERDICT_DUE_DAYS = 3;
/** The curator may start a draft from the first day of this sprint. */
export const VERDICT_DRAFT_FROM_SPRINT = 4;
/** Read by the author word for word. */
export const VERDICT_NOTE_MAX = 1200;

// The goal card

export const CHECKPOINT_GOAL_MAX = 500;
export const CHECKPOINT_ITEM_TEXT_MAX = 200;
export const CHECKPOINT_MAX_ITEMS_PER_KIND = 12;

// Buying one

/**
 * A checkpoint under way. `AwaitingCurator` belongs here and not with the
 * drafts: it has been paid for, and a second one may not be started beside it.
 */
export const CHECKPOINT_OPEN_STATUSES = [
	CheckpointStatus.AwaitingCurator,
	CheckpointStatus.Active,
	CheckpointStatus.Review,
];

/** "What's done so far" on the way in: at least one line, at most this many. */
export const CHECKPOINT_ENTRY_ITEMS_MAX = 5;

/** A Checkpoint is sold to people this old or older (Purchase Terms), by year of birth. */
export const CHECKPOINT_MIN_AGE = 18;

/** "Briefly about your experience" on About you. */
export const CHECKPOINT_EXPERIENCE_MAX = 500;

/** How long a curator has to answer before the money goes back. */
export const CURATOR_ANSWER_DAYS = 3;
/** The first call is booked at least this many days ahead. */
export const FIRST_CALL_MIN_DAYS = 3;

// An advisor's hours

/** How often an advisor is asked whether their hours still hold. */
export const AVAILABILITY_REMIND_DAYS = 30;
/** Hours left unconfirmed this long are not offered for new checkpoints. */
export const AVAILABILITY_STALE_DAYS = 60;
/** How far ahead a free series is looked for when nothing ends it sooner. */
export const AVAILABILITY_SEARCH_DAYS = 365;
/** How long the payment webhook is given before Stripe is asked instead. */
export const PAYMENT_WEBHOOK_GRACE_MINUTES = 60;

/** The screen writes a `$`, so USD is what is charged and what the row stores. */
export const CHECKPOINT_PRICE_CURRENCY = "$";
export const CHECKPOINT_CURRENCY = "USD";
/** Prices are written in whole units; Stripe and `Payment.amount` want minor ones. */
export const CHECKPOINT_MINOR_UNITS = 100;

/** The AI curator has one price and it does not move with the team. */
export const CHECKPOINT_AI_PRICE = 19;

/**
 * A curator's price by level, for any team up to `CHECKPOINT_MAX_TEAM`. A level
 * with no price is not offered — see `config/checkpoint-pricing.ts`.
 */
export const CURATOR_PRICE = {
	Experienced: 300,
	Expert: 450,
} as const satisfies Partial<Record<SkillLevel, number>>;
