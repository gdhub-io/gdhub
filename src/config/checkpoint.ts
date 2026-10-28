import { hubLegalEntity } from "@/config/legal/entities";
import {
	CheckpointStatus,
	PaymentProvider,
	type SkillLevel,
} from "@/config/prisma-enums";

/**
 * Every number a checkpoint runs on. Code that needs one imports it from here;
 * the arithmetic built on them (`sessionDay`, `dueDateFrom`) lives in `lib/`, and
 * the price lookups in `config/checkpoint-pricing.ts`. Browser-safe.
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
export const CHECKPOINT_LARGE_TEAM_EMAIL = hubLegalEntity().infoEmail;

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

/**
 * Day 1 (Dmitry, 2026-10-26): after payment the author writes the tasks and
 * sends them for the AI's one check; the plan stays open until they approve
 * it, and approves itself this many hours after the check.
 */
export const AI_APPROVE_HOURS = 12;
/** Hours after payment at which an author who has not sent the tasks is reminded; the plan stays open. */
export const AI_REMIND_HOURS = [24, 72] as const;
/** The author's local hour those reminders go out at: the first such morning after each mark. */
export const AI_REMIND_LOCAL_HOUR = 10;
/** Day 15 with the AI curator: hours before the change closes that an author who has not confirmed is reminded. */
export const SCOPE_REMIND_BEFORE_HOURS = 4;
/** The day an author whose tasks still lack evidence is told, three days before the verdict. */
export const EVIDENCE_REMIND_DAY = 26;
/** With a pro curator: the goal and tasks stay open this long after call 1 ends, then are fixed. */
export const PRO_PLAN_AFTER_CALL_HOURS = 12;

/** The AI curator's face when it plays no character: the platform's robot (frame 12.19). */
export const AI_CURATOR_AVATAR = "/curators/robot.webp";

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

/** Under way: the 28 days or their review. A refund only ever stops one of these. */
export const CHECKPOINT_RUNNING_STATUSES: CheckpointStatus[] = [
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
export const CHECKPOINT_AI_PRICE = 20;

/** An amount promotion code must leave at least this much to charge, in minor units. */
export const MIN_CHARGE_AFTER_DISCOUNT = 50;

/**
 * Whether a checkpoint with an expert can be bought. Off until there is a seller
 * for human curation (GDHUB-107): choosing an expert leads to a waitlist.
 */
export const EXPERT_CHECKPOINT_OPEN = false;

/**
 * Who takes the money for a new checkpoint checkout and holds the promotion codes
 * (GDHUB-106). A payment already made stays with the provider that took it.
 */
export const CHECKPOINT_PAYMENT_PROVIDER: PaymentProvider =
	PaymentProvider.PADDLE;

// Refunds

/**
 * What a checkpoint is split into, for a refund and for the curator's fee
 * (GDHUB-74): five calls and the verdict with a person — the goal card is fixed
 * on call 1 and counts with it — and three reviews and the final one with the
 * verdict for the AI. Every price splits by these with no remainder.
 */
export const CHECKPOINT_PARTS = { Human: 6, AI: 4 } as const;
/** EU right of withdrawal, from the day the price is paid. */
export const WITHDRAWAL_DAYS = 14;

/**
 * A curator's price by level, for any team up to `CHECKPOINT_MAX_TEAM`. A level
 * with no price is not offered — see `config/checkpoint-pricing.ts`.
 */
export const CURATOR_PRICE = {
	Experienced: 300,
	Expert: 450,
} as const satisfies Partial<Record<SkillLevel, number>>;

// Curator payouts (Advisor Agreement §7, §9)

/** What the platform keeps of a human checkpoint's price; the curator's fee is the rest. */
export const PLATFORM_SHARE = 0.3;
/** Fees earned in a month are paid by this day of the next one. */
export const PAYOUT_DUE_DAY = 15;
export const PAYOUT_NOTE_MAX = 500;

// Ratings and curator approval (GDHUB-74)

/** Fewer answers than this say too little: no average is shown. */
export const RATINGS_BEFORE_AVERAGE = 5;
export const RATING_COMMENT_MAX = 500;
/** The admin's note when declining or revoking a curator. */
export const CURATOR_NOTE_MIN = 3;
export const CURATOR_NOTE_MAX = 500;

// Running cost

/** Daily, per participant-minute of video, in USD. */
export const DAILY_VIDEO_RATE = 0.004;
/** Daily cloud recording, per minute of call. */
export const DAILY_RECORDING_RATE = 0.005;
/** Daily post-call transcript, per minute of call. */
export const DAILY_TRANSCRIPT_RATE = 0.0043;

/**
 * USD per million tokens, input and output, OpenAI's standard tier as of
 * October 2026. A call to a model missing here is recorded at no cost and
 * logged, so a new model shows up rather than hiding.
 */
export const AI_MODEL_PRICES: Record<
	string,
	{ input: number; output: number }
> = {
	"gpt-5.6-luna": { input: 0.2, output: 1.2 },
	"gpt-6-sol": { input: 2, output: 10 },
	"gpt-6.1-sol": { input: 2, output: 10 },
	"gpt-6-luna": { input: 0.1, output: 0.5 },
};

/**
 * What each stage of the Default workflow is for, as the AI curator reads it
 * (Dmitry, 2026-10-26). Written for the model, not the author: the stage's
 * Notion page is advice to the author, and handed to the model it reads as
 * owed. Whether a stage is passed is never in here — that is its required
 * tasks, all done. A stage not listed reaches the curator with no description.
 */
export const CURATOR_STAGE_BRIEFS: Record<string, string> = {
	Introduction:
		"The platform's own onboarding: the author learns how GDHub works and presses Next when ready. Nothing is built, and nobody else sees the project yet.",
	Ideation:
		"Generating ideas and choosing one — through research (the market, games like it) or the author's own vision — then writing it up: the ideas weighed, why this one, and a one-page description of it.",
	Concepting:
		"Turning the chosen idea into a concept the team can build from: core loop, main mechanics, audience, scope, art direction (mood board, references), and the riskiest open questions, which Prototyping answers.",
	Prototyping:
		"Answering the concept's riskiest questions cheaply: a rough playable build of the core mechanic, an art prototype (style variants, a visual target) or a technical test, and what the team learned from it. Polish and content are not expected; a proven core and a chosen style go on to the demo.",
	"Preparing a demo version":
		"Building a vertical slice on the proven core — one short part of the game at near-final quality, showing it can be made, not only that it is fun — and publishing it as a demo anyone can play (itch.io, a Steam demo or playtest), with the game's Steam page live by the end.",
	"Taking and analyzing metrics":
		"Putting the demo in front of players and reading what they do — wishlists, store traffic, playtime, where they drop off, what they say — and the decisions taken from it: what to fix, cut or build on.",
	"Preparing a release version":
		"Main production: building the full game on those decisions and finishing it — content locked, bugs going down, store page, price and release date set. Several checkpoints usually sit here. It ends with the launch: moving to Support is the release.",
	Support:
		"The game is out: fixes and patches, answers to players and reviews, and the sales and review numbers that the project's close reads.",
	"Project Completion":
		"Closing the project: a postmortem — what went right, what went wrong, the lessons — and the final numbers, for the team's next project.",
};
