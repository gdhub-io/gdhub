import { describe, expect, it } from "vitest";
import * as schemas from "@/services/ai-curator-lab/schemas";
import { evidenceSituations } from "@/services/ai-curator-lab/situations/evidence";
import { goalCheckSituations } from "@/services/ai-curator-lab/situations/goal-check";
import { planAdviceSituations } from "@/services/ai-curator-lab/situations/plan-advice";
import { reportSituations } from "@/services/ai-curator-lab/situations/report";
import { sprintReviewSituations } from "@/services/ai-curator-lab/situations/sprint-review";
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
		["planAdvice", schemas.planAdviceInput, planAdviceSituations],
		["sprintReview", schemas.sprintReviewInput, sprintReviewSituations],
		["evidence", schemas.evidenceInput, evidenceSituations],
		["report", schemas.reportInput, reportSituations],
	] as const)("every %s situation is an input that call takes, in both languages", (_, schema, situations) => {
		const en = situations("en");
		const ru = situations("ru");
		for (const situation of [...en, ...ru]) {
			expect(
				(schema as { safeParse: (value: unknown) => { error?: unknown } }).safeParse(
					situation.input,
				).error,
				situation.id,
			).toBeUndefined();
		}
		// The same situations, one for one, so switching language keeps the pick.
		expect(ru.map((each) => each.id)).toEqual(en.map((each) => each.id));
		expect(new Set(en.map((each) => each.id)).size).toBe(en.length);
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
