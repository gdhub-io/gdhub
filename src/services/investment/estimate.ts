import { SkillLevel as Level, type SkillLevel } from "@/config/prisma-enums";

/**
 * A rough, automatic guess at what a project costs, for the rows where nobody
 * has stated a real figure.
 *
 * The industry way of sizing a game budget is team × rate × duration, with a
 * contingency reserve on top — producers keep 20–30% back. The duration is
 * `TOTAL_MONTHS` of full-time work per seat, so the price is the size of the job
 * rather than a function of anyone's spare evenings: a game does not get cheaper
 * because the person making it only has five hours a week, it takes eight times
 * as long. Hours set the calendar (`monthsToRelease`), never the price.
 *
 * That the two halves agree is worth noting: the same reporting says building a
 * game evenings-and-weekends at 10–15 hours a week "roughly triples the
 * calendar", and this model — arrived at from hours alone — stretches 12.5 h/wk
 * by 3.2×.
 *
 * The workflow then splits that budget in two: what has already been paid for,
 * and what a scout would have to put in to see the game finished. A project on
 * day one has spent nothing, however many people are standing around it.
 *
 * Everything it needs is already on the platform: how many people are on the
 * team, how skilled they are, how many hours a week they said they can give,
 * which workflow steps are done, and how many roles are still open.
 *
 * Applause and expert reviews are deliberately absent. They are reputation, and
 * reputation does not change what an hour of work cost — they belong in their
 * own columns, next to this one, not inside it.
 *
 * It is not a valuation and must never be shown as one.
 */

/**
 * Dollars an hour by skill level.
 *
 * Anchored on the $15/h the landing page has always used for the platform's
 * "time invested" figure, so the two numbers cannot disagree, and spread around
 * it with the ~4× junior-to-senior ratio the market shows. Deliberately below
 * US studio rates: the people here are indie, worldwide and mostly part-time.
 */
export const HOURLY_RATE: Record<SkillLevel, number> = {
	[Level.Novice]: 8,
	[Level.Beginner]: 12,
	[Level.Skillful]: 15,
	[Level.Experienced]: 22,
	[Level.Expert]: 32,
};

/**
 * Idea to release for a team working full time. Not a promise about anybody's
 * calendar — it is how the size of the job is expressed, and the pace the team
 * actually keeps stretches it (see `monthsToRelease`).
 *
 * 18 months is the figure the industry reports for indie games that actually
 * shipped, across scopes from a small polished 2D game (6–18) to mid-scope 3D
 * (2–4 years). Two years was the earlier guess and double-counted: it read like
 * a full-time baseline while already carrying some of the part-time drag that
 * `pace` applies on top.
 *
 * Sources (Aug 2026):
 *   https://www.strayspark.studio/blog/how-long-does-it-take-to-make-an-indie-game
 *   https://levvvel.com/statistics/game-development/
 *
 * Caveat worth keeping: those are statistics aggregators, and it is not clear
 * whether their 18 months is full-time or an average over a population that is
 * ~60% part-time. If it is the latter, this number is still generous.
 */
export const TOTAL_MONTHS = 18;

/** 52 weeks over 12 months. Using 4 would lose about a week a year. */
const WEEKS_PER_MONTH = 52 / 12;

/** Eight hours over five weekdays: what "full time" means here. */
const FULL_TIME_HOURS_PER_WEEK = 40;

/** Hours one full-time person puts into the arc, and the unit of the estimate. */
const FULL_TIME_HOURS =
	FULL_TIME_HOURS_PER_WEEK * WEEKS_PER_MONTH * TOTAL_MONTHS;

/** What a member is assumed to give when their profile does not say. */
const DEFAULT_HOURS_PER_WEEK = 10;

/** Producers keep 20–30% back for what the plan did not see coming. */
const CONTINGENCY = 0.25;

/**
 * Marketing, as a share of what the game costs to build. A game nobody hears
 * about is not finished, so this belongs in the number a scout reads.
 *
 * 25% is the figure the indie advice converges on: 15–30% of dev cost for
 * budgets in the $50K–$500K band, and a broader 25–50% rule of thumb. The
 * higher end assumes commercial ambition the platform cannot see from here, so
 * the estimate takes the conservative reading.
 */
export const MARKETING_SHARE = 0.25;

/** The rate an unfilled role is costed at — nobody is in it to have a level. */
const OPEN_POSITION_RATE = HOURLY_RATE[Level.Skillful];

/**
 * Steps that happen after the game is out — `Support` and `Project Completion`,
 * as the `default` workflow seeds them. Investment is the story up to and
 * including release; what comes after runs against revenue, so counting it
 * would make every shipped project look like it is still burning money.
 *
 * Matched by name because nothing in the schema marks a step as post-release.
 * Position cannot tell us either: a workflow may end at the release build.
 */
const POST_RELEASE = ["support", "projectcompletion"];

const normalize = (name: string): string =>
	name.toLowerCase().replace(/[^a-z]/g, "");

export type EstimateMember = {
	level: SkillLevel;
	/** `Profile.timeForWork`, a `[min, max]` range of hours a week. */
	hoursPerWeek: readonly number[] | null;
};

export type EstimateStep = { name: string; order: number; done: boolean };

export type EstimateInput = {
	team: readonly EstimateMember[];
	/** Vacancies the project has published: roles it is paying for next. */
	openPositions: number;
	/** The project's workflow steps, in any order. Empty when it has none. */
	steps: readonly EstimateStep[];
	/**
	 * `order` of the step the project stands on, when it has one.
	 *
	 * Load-bearing: advancing a project writes `currentStepId` and nothing
	 * else, so `done` stays false on every step it has already walked past.
	 * Read on its own, a project at the release build looks untouched.
	 */
	currentStepOrder?: number | null;
};

export type InvestmentEstimate = {
	/** What the project looks to have cost so far, reserve included. */
	total: number;
	/** What finishing it would still cost, at this size plus the open roles. */
	remaining: number;
	/** Share of the road to release that is behind it, 0–1. */
	maturity: number;
	/** What the team costs to run for a month, open roles included. */
	monthlyBurn: number;
	/** How full-time the team is: 1 is everybody at forty hours a week. */
	pace: number;
	/** Months to release at that pace. `null` when nobody is working on it. */
	monthsToRelease: number | null;
	teamSize: number;
	openPositions: number;
};

/**
 * The middle of the range someone gave in onboarding. A range is what the form
 * collects, and the midpoint is the only point in it that does not
 * systematically over- or under-state the answer.
 */
const hoursOf = (member: EstimateMember): number => {
	const range = member.hoursPerWeek;
	if (!range?.length) return DEFAULT_HOURS_PER_WEEK;

	const [min, max = min] = range;

	return (min + max) / 2;
};

const monthlyCost = (hoursPerWeek: number, rate: number): number =>
	hoursPerWeek * WEEKS_PER_MONTH * rate;

const isPostRelease = (name: string): boolean => {
	const key = normalize(name);

	return POST_RELEASE.some((marker) => key.includes(marker));
};

/** The pre-release steps of a workflow, in the order the team walks them. */
const releaseArc = (steps: readonly EstimateStep[]): EstimateStep[] =>
	steps
		.filter((step) => !isPostRelease(step.name))
		.sort((a, b) => a.order - b.order);

/**
 * How much of the way to release the project is.
 *
 * Weighted by position, not by equal shares: work gets more expensive the
 * further a game goes — the first step is a project that has not started, and
 * building the release version costs many times what writing the concept did.
 * A step's weight is simply how many steps precede it, so the first is free and
 * the last is the heaviest. Over the default workflow that puts ~14% of the
 * money before Prototyping and ~57% between there and the release build, which
 * is the 15/60/25 split the industry reports — without a table of step names
 * that would rot the moment somebody edits the schema.
 *
 * Steps rather than dates: a project can sit in one step for a year, and the
 * workflow is the only thing on the platform that says how much of the game is
 * really done.
 */
const maturityOf = (
	arc: readonly EstimateStep[],
	isDone: (step: EstimateStep) => boolean,
): number => {
	// 0 + 1 + … + (n-1), the weights of every step in the arc.
	const whole = (arc.length * (arc.length - 1)) / 2;
	if (whole <= 0) return 0;

	const done = arc.reduce(
		(total, step, index) => (isDone(step) ? total + index : total),
		0,
	);

	return Math.min(1, done / whole);
};

/**
 * `null` when there is nothing to go on — no team and no open roles. A figure
 * built from no inputs is not a rough estimate, it is a made-up number.
 */
export function estimateInvestment(
	input: EstimateInput,
): InvestmentEstimate | null {
	const teamSize = input.team.length;
	const openPositions = Math.max(0, input.openPositions);

	if (teamSize === 0 && openPositions === 0) return null;

	// One pass over the team for all three: what the seats cost, what the team
	// really gives, and what that comes to a month.
	//
	// The seat cost is the size of the job and is deliberately independent of
	// the hours people give — a game does not become cheaper because the person
	// making it only has evenings, it takes longer. Cost is effort; hours are
	// pace.
	let seatCost = 0;
	let teamHours = 0;
	let teamBurn = 0;

	for (const member of input.team) {
		const rate = HOURLY_RATE[member.level];
		const hours = hoursOf(member);

		seatCost += FULL_TIME_HOURS * rate;
		teamHours += hours;
		teamBurn += monthlyCost(hours, rate);
	}

	// An open role covers the seat from here on — never backwards, over the part
	// of the arc nobody was in it.
	const openSeatCost = openPositions * FULL_TIME_HOURS * OPEN_POSITION_RATE;

	const arcSteps = releaseArc(input.steps);
	// A step is behind the project if it says so, or if the project now stands
	// on a later one — `done` alone is never written when a project advances.
	const current = input.currentStepOrder;
	const isDone = (step: EstimateStep) =>
		step.done || (current != null && step.order < current);
	const maturity = maturityOf(arcSteps, isDone);
	const factor = (1 + CONTINGENCY) * (1 + MARKETING_SHARE);

	const pace = teamSize ? teamHours / (teamSize * FULL_TIME_HOURS_PER_WEEK) : 0;

	const monthlyBurn =
		teamBurn +
		openPositions * monthlyCost(DEFAULT_HOURS_PER_WEEK, OPEN_POSITION_RATE);

	return {
		total: Math.round(seatCost * factor * maturity),
		remaining: Math.round((seatCost + openSeatCost) * factor * (1 - maturity)),
		maturity: Math.round(maturity * 100) / 100,
		monthlyBurn: Math.round(monthlyBurn),
		pace: Math.round(pace * 100) / 100,
		// `TOTAL_MONTHS` is the full-time figure; at a third of full time it is
		// three times that, and that is the number a scout has to see.
		monthsToRelease: pace
			? Math.round((TOTAL_MONTHS * (1 - maturity)) / pace)
			: null,
		teamSize,
		openPositions,
	};
}
