import { describe, expect, it } from "vitest";
import { SkillLevel } from "@/config/prisma-enums";
import {
	type EstimateInput,
	estimateInvestment,
	HOURLY_RATE,
	MARKETING_SHARE,
	TOTAL_MONTHS,
} from "@/services/investment/estimate";

/** The default workflow, as the prisma package seeds it. */
const WORKFLOW = [
	"Introduction",
	"Ideation",
	"Concepting",
	"Prototyping",
	"Preparing a demo version",
	"Taking and analyzing metrics",
	"Preparing a release version",
	"Support",
	"Project Completion",
];

/** The default workflow with everything up to and including `upTo` finished. */
const stepsUpTo = (upTo: string | null) => {
	const cut = upTo === null ? -1 : WORKFLOW.indexOf(upTo);

	return WORKFLOW.map((name, index) => ({ name, order: index + 1, done: index <= cut }));
};

const member = (
	level: SkillLevel = SkillLevel.Skillful,
	hoursPerWeek: number[] | null = [10, 10],
) => ({ level, hoursPerWeek });

const input = (over: Partial<EstimateInput> = {}): EstimateInput => ({
	team: [member()],
	openPositions: 0,
	steps: stepsUpTo(null),
	...over,
});

describe("estimateInvestment", () => {
	it("has nothing to say about a project with no team and no open roles", () => {
		expect(estimateInvestment(input({ team: [], openPositions: 0 }))).toBeNull();
	});

	it("reads a project on day one as zero, however many people are on it", () => {
		const crowd = estimateInvestment(
			input({ team: Array.from({ length: 20 }, () => member()) }),
		);

		expect(crowd?.maturity).toBe(0);
		expect(crowd?.total).toBe(0);
		// Nothing has been put in, but finishing it still costs something.
		expect(crowd?.remaining).toBeGreaterThan(0);
	});

	it("grows with every step the team closes", () => {
		const totals = [
			"Introduction",
			"Concepting",
			"Prototyping",
			"Preparing a demo version",
			"Preparing a release version",
		].map(
			(step) => estimateInvestment(input({ steps: stepsUpTo(step) }))?.total ?? 0,
		);

		expect(totals).toEqual([...totals].sort((a, b) => a - b));
		expect(new Set(totals).size).toBe(totals.length);
	});

	it("weights the steps by what they cost, not by how many there are", () => {
		// Three of seven steps done, but they are the cheap ones. An equal split
		// would call that 43%; the industry puts pre-production at ~15%.
		const estimate = estimateInvestment(
			input({ steps: stepsUpTo("Concepting") }),
		);

		expect(estimate?.maturity).toBe(0.14);
	});

	it("charges nothing for a project that has only been introduced", () => {
		// The first step is the project before work starts on it.
		const estimate = estimateInvestment(
			input({ steps: stepsUpTo("Introduction") }),
		);

		expect(estimate?.maturity).toBe(0);
		expect(estimate?.total).toBe(0);
	});

	it("counts the release build, and stops there", () => {
		const released = estimateInvestment(
			input({ steps: stepsUpTo("Preparing a release version") }),
		);

		// Support and Project Completion are neither in the denominator nor able
		// to push the project past done: finishing the release build is 100%,
		// with two steps still sitting in the list.
		expect(released?.maturity).toBe(1);
		expect(released?.remaining).toBe(0);
	});

	it("does not let post-release steps drag the estimate back down", () => {
		const shipped = estimateInvestment(
			input({ steps: stepsUpTo("Project Completion") }),
		);
		const atRelease = estimateInvestment(
			input({ steps: stepsUpTo("Preparing a release version") }),
		);

		expect(shipped?.total).toBe(atRelease?.total);
	});

	it("works off whatever workflow the project actually uses", () => {
		// A hand-built schema with names nothing could recognise still reads:
		// weights come from the order of the steps, not from what they are called.
		const estimate = estimateInvestment(
			input({
				steps: [
					{ name: "Kickoff", order: 1, done: true },
					{ name: "Build", order: 2, done: true },
					{ name: "Ship", order: 3, done: false },
					{ name: "Party", order: 4, done: false },
				],
			}),
		);

		// Weights 0+1+2+3 = 6, of which the first two account for 1.
		expect(estimate?.maturity).toBe(0.17);
	});

	it("reads the steps in workflow order, not in the order they arrive", () => {
		const shuffled = [...stepsUpTo("Concepting")].reverse();

		expect(estimateInvestment(input({ steps: shuffled }))?.maturity).toBe(
			estimateInvestment(input({ steps: stepsUpTo("Concepting") }))?.maturity,
		);
	});

	it("charges an expert more than a novice for the same hours", () => {
		const half = stepsUpTo("Prototyping");

		const novice = estimateInvestment(
			input({ team: [member(SkillLevel.Novice)], steps: half }),
		);
		const expert = estimateInvestment(
			input({ team: [member(SkillLevel.Expert)], steps: half }),
		);

		expect(expert?.total).toBeGreaterThan((novice?.total ?? 0) * 3);
	});

	it("takes the middle of the hours somebody offered, not an end of it", () => {
		const range = estimateInvestment(
			input({ team: [member(SkillLevel.Skillful, [5, 15])] }),
		);
		const middle = estimateInvestment(
			input({ team: [member(SkillLevel.Skillful, [10, 10])] }),
		);

		expect(range?.pace).toBe(middle?.pace);
	});

	it("assumes a part-time week when the profile does not say", () => {
		const unknown = estimateInvestment(
			input({ team: [member(SkillLevel.Skillful, null)] }),
		);
		const stated = estimateInvestment(
			input({ team: [member(SkillLevel.Skillful, [10, 10])] }),
		);

		expect(unknown?.pace).toBe(stated?.pace);
	});

	it("prices the job, not the calendar — spare evenings cost the same", () => {
		const half = stepsUpTo("Prototyping");

		const fullTime = estimateInvestment(
			input({ team: [member(SkillLevel.Skillful, [40, 40])], steps: half }),
		);
		const evenings = estimateInvestment(
			input({ team: [member(SkillLevel.Skillful, [5, 5])], steps: half }),
		);

		// The game is the same game. What changes is how long it takes.
		expect(evenings?.total).toBe(fullTime?.total);
		expect(evenings?.remaining).toBe(fullTime?.remaining);
	});

	it("stretches the baseline by however far off full time the team is", () => {
		const fullTime = estimateInvestment(
			input({ team: [member(SkillLevel.Skillful, [40, 40])] }),
		);
		const evenings = estimateInvestment(
			input({ team: [member(SkillLevel.Skillful, [5, 5])] }),
		);

		expect(fullTime?.pace).toBe(1);
		expect(fullTime?.monthsToRelease).toBe(TOTAL_MONTHS);

		// Five hours a week is an eighth of full time, so eight times as long.
		expect(evenings?.pace).toBe(0.13);
		expect(evenings?.monthsToRelease).toBe(TOTAL_MONTHS * 8);
	});

	it("stretches an evenings-and-weekends project about threefold", () => {
		// The reporting this baseline comes from says 10–15 h/wk "roughly
		// triples the calendar". Arrived at here from the hours alone, so the
		// agreement is worth pinning down.
		const evenings = estimateInvestment(
			input({ team: [member(SkillLevel.Skillful, [10, 15])] }),
		);

		const stretch = (evenings?.monthsToRelease ?? 0) / TOTAL_MONTHS;

		expect(stretch).toBeGreaterThan(2.8);
		expect(stretch).toBeLessThan(3.5);
	});

	it("counts down the calendar as the workflow moves", () => {
		const started = estimateInvestment(
			input({
				team: [member(SkillLevel.Skillful, [40, 40])],
				steps: stepsUpTo("Preparing a demo version"),
			}),
		);

		expect(started?.monthsToRelease).toBeLessThan(TOTAL_MONTHS);
	});

	it("has no calendar to offer when nobody is on the project yet", () => {
		const estimate = estimateInvestment(input({ team: [], openPositions: 2 }));

		expect(estimate?.pace).toBe(0);
		expect(estimate?.monthsToRelease).toBeNull();
	});

	it("treats a project with no workflow as one that has not started", () => {
		expect(estimateInvestment(input({ steps: [] }))?.maturity).toBe(0);
	});

	it("puts an open role in what is left, never in what was spent", () => {
		const half = stepsUpTo("Prototyping");

		const withRole = estimateInvestment(input({ steps: half, openPositions: 2 }));
		const without = estimateInvestment(input({ steps: half, openPositions: 0 }));

		expect(withRole?.total).toBe(without?.total);
		expect(withRole?.remaining).toBeGreaterThan(without?.remaining ?? 0);
		expect(withRole?.monthlyBurn).toBeGreaterThan(without?.monthlyBurn ?? 0);
	});

	it("prices a project that is nothing but open roles", () => {
		const estimate = estimateInvestment(input({ team: [], openPositions: 3 }));

		expect(estimate).not.toBeNull();
		expect(estimate?.teamSize).toBe(0);
		expect(estimate?.total).toBe(0);
		expect(estimate?.remaining).toBeGreaterThan(0);
	});

	it("reports the monthly burn the figures are built from", () => {
		const estimate = estimateInvestment(
			input({ team: [member(SkillLevel.Skillful, [10, 10])] }),
		);

		expect(estimate?.monthlyBurn).toBe(
			Math.round(10 * (52 / 12) * HOURLY_RATE[SkillLevel.Skillful]),
		);
	});

	it("sizes a full-time solo project the way a person would", () => {
		// One Skillful developer, full time, idea to release: eighteen months of
		// forty-hour weeks at $15 is about $47K of work, and the reserve puts
		// the development figure near $59K before marketing is added.
		const estimate = estimateInvestment(
			input({
				team: [member(SkillLevel.Skillful, [40, 40])],
				steps: stepsUpTo("Preparing a release version"),
			}),
		);

		const development = (estimate?.total ?? 0) / (1 + MARKETING_SHARE);

		expect(development).toBeGreaterThan(45_000);
		expect(development).toBeLessThan(70_000);
	});

	it("reads progress off the step the project stands on", () => {
		// Advancing a project writes `currentStepId` and nothing else, so every
		// step it walked past still says `done: false`. Going by that alone, a
		// project at the release build reads as untouched.
		const untouched = WORKFLOW.map((name, index) => ({
			name,
			order: index + 1,
			done: false,
		}));

		const estimate = estimateInvestment(
			input({ steps: untouched, currentStepOrder: 7 }),
		);

		expect(estimate?.maturity).toBeGreaterThan(0.7);
	});

	it("still trusts a step that says it is done", () => {
		const estimate = estimateInvestment(
			input({ steps: stepsUpTo("Concepting"), currentStepOrder: null }),
		);

		expect(estimate?.maturity).toBe(0.14);
	});

	it("counts a step once, however both signals read", () => {
		// Concepting is both flagged done and behind the current step.
		const estimate = estimateInvestment(
			input({ steps: stepsUpTo("Concepting"), currentStepOrder: 4 }),
		);

		expect(estimate?.maturity).toBe(0.14);
	});
});
