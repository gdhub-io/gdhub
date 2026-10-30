import { beforeEach, describe, expect, it, vi } from "vitest";

const generateText = vi.fn();

vi.mock("ai", () => ({
	generateText: (...a: unknown[]) => generateText(...a),
	Output: { object: (spec: { name: string }) => spec },
}));
vi.mock("@ai-sdk/openai", () => ({ openai: (model: string) => model }));
vi.mock("@/services/ai-trace", () => ({ traceGenerated: vi.fn() }));
vi.mock("@/services/ai-usage", () => ({ recordAiUsage: vi.fn() }));

const { reviewSprint } = await import("@/services/checkpoints/ai-review");
const { hollowTide } = await import(
	"@/services/checkpoints/ai-curator-lab/situations/hollow-tide"
);
const project = hollowTide("en");

const input = {
	goal: "A playable slice",
	workflow: project.workflow("sprint2"),
	sprint: 2,
	tasks: [
		{
			id: "t1",
			text: "Playtest with 5 players",
			cut: false,
			firstWording: null,
			evidence: [],
		},
	],
	devlogs: [],
	devlogMedia: [],
	artifacts: [],
	team: project.team("sprint2"),
	focusLastReview: [],
	verdict: null,
	picture: "",
	marketing: { devlogs: [], links: [] },
};

const answers: Record<string, unknown> = {
	sprint_review: {
		inShort: "At risk: nothing was shown.",
		discussed: [],
		notDiscussed: ["t1"],
		outsidePlan: [],
		questions: [],
		lenses: {
			marketing: "No public devlog this sprint.",
			team: "Two confirmed working.",
			management: "Nothing closed yet.",
		},
	},
	review_letter: {
		message: "At risk.",
		agreed: [{ text: "Test with one player", itemId: "t1", dueDay: null }],
	},
};

beforeEach(() => {
	generateText.mockReset();
	generateText.mockImplementation(async ({ output }) => ({
		output: answers[output.name],
		usage: {},
	}));
});

describe("reviewSprint", () => {
	it("writes the review, gives it to the advice, and the letter reads both", async () => {
		const advise = vi.fn(async (_review: string) => ({
			tasks: [
				{
					itemId: "t1",
					kind: "shorten" as const,
					note: "Start with one player.",
					suggestion: null,
				},
			],
			add: [],
		}));

		const result = await reviewSprint(input, advise);

		expect(advise.mock.calls[0][0]).toContain("At risk: nothing was shown.");
		expect(advise.mock.calls[0][0]).toContain(
			"Nothing shown yet for: Playtest with 5 players",
		);
		const letterCall = generateText.mock.calls[1][0];
		expect(letterCall.output.name).toBe("review_letter");
		expect(letterCall.prompt).toContain("At risk: nothing was shown.");
		// The letter names what it looked at before judging it.
		expect(letterCall.prompt).toContain("Nothing: no devlog and no artifact.");
		expect(letterCall.prompt).toContain(
			"Playtest with 5 players (shorten): Start with one player.",
		);
		expect(result).toMatchObject({
			message: "At risk.",
			notes: { inShort: "At risk: nothing was shown.", agreed: [{ itemId: "t1" }] },
			advice: { tasks: [{ itemId: "t1" }] },
		});
	});

	it("drops from the focus a task the advice cuts", async () => {
		const result = await reviewSprint(input, async () => ({
			tasks: [
				{ itemId: "t1", kind: "cut" as const, note: "Drop it.", suggestion: null },
			],
			add: [],
		}));
		expect(result?.notes.agreed).toEqual([]);
	});

	it("asks for no advice outside halfway", async () => {
		const result = await reviewSprint(input, null);
		expect(generateText).toHaveBeenCalledTimes(2);
		expect(generateText.mock.calls[1][0].prompt).not.toContain(
			"Your advice on the tasks",
		);
		expect(result?.advice).toBeNull();
	});

	it("still writes the letter when the advice fails", async () => {
		const result = await reviewSprint(input, async () => {
			throw new Error("model down");
		});
		expect(result?.message).toBe("At risk.");
		expect(result?.advice).toBeNull();
	});
});
