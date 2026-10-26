import { describe, expect, it, vi } from "vitest";
import * as schemas from "@/services/ai-curator-lab/schemas";
import { evidenceSituations } from "@/services/ai-curator-lab/situations/evidence";
import { goalCheckSituations } from "@/services/ai-curator-lab/situations/goal-check";
import { planAdviceSituations } from "@/services/ai-curator-lab/situations/plan-advice";
import { reportSituations } from "@/services/ai-curator-lab/situations/report";
import { sprintReviewSituations } from "@/services/ai-curator-lab/situations/sprint-review";
import { suggestLinesSituations } from "@/services/ai-curator-lab/situations/suggest-lines";
import { traceAiCall, traced } from "@/services/ai-trace";

const trace = (name: string) => ({
	name,
	model: "m",
	system: "",
	messages: [],
	raw: null,
	inputTokens: 1,
	outputTokens: 1,
	ms: 1,
});

describe("the AI curator lab (GDHUB-117)", () => {
	it.each([
		["goalCheck", schemas.goalCheckInput, goalCheckSituations],
		["suggestLines", schemas.suggestLinesInput, suggestLinesSituations],
		["planAdvice", schemas.planAdviceInput, planAdviceSituations],
		["sprintReview", schemas.sprintReviewInput, sprintReviewSituations],
		["evidence", schemas.evidenceInput, evidenceSituations],
		["report", schemas.reportInput, reportSituations],
	] as const)("every %s situation is an input that call takes", (_, schema, situations) => {
		for (const situation of situations) {
			expect(schema.safeParse(situation.input).error, situation.id).toBeUndefined();
		}
		expect(new Set(situations.map((each) => each.id)).size).toBe(situations.length);
	});

	it("collects the calls made inside a run, and only those", async () => {
		traceAiCall(() => trace("outside"));
		const { result, traces } = await traced(async () => {
			await Promise.resolve();
			traceAiCall(() => trace("inside"));
			return 42;
		});

		expect(result).toBe(42);
		expect(traces.map((each) => each.name)).toEqual(["inside"]);
	});
});

vi.mock("ai", async (actual) => ({
	...(await actual<typeof import("ai")>()),
	generateText: vi.fn(async ({ prompt }: { prompt: string }) => ({
		output: {
			translations: (JSON.parse(prompt) as string[]).map((text) => `RU ${text}`),
		},
	})),
}));
vi.mock("@ai-sdk/openai", () => ({ openai: () => ({}) }));

describe("reading the lab's data in Russian", () => {
	it("translates prose and leaves ids, enums and links as they are", async () => {
		const { inRussian } = await import("@/services/ai-curator-lab/translate");

		expect(
			await inRussian({
				id: "o1",
				kind: "Outcome",
				text: "Playtest with 5 players",
				link: "https://example.com/a b",
				notes: ["Two got stuck", "Matches"],
			}),
		).toEqual({
			id: "o1",
			kind: "Outcome",
			text: "RU Playtest with 5 players",
			link: "https://example.com/a b",
			notes: ["RU Two got stuck", "Matches"],
		});
	});
});
