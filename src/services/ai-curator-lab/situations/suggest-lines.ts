import type { Situation, suggestLinesInput } from "../schemas";
import { GOAL, STAGE } from "./hollow-tide";

export const suggestLinesSituations: Situation<typeof suggestLinesInput>[] = [
	{
		id: "outcomes",
		label: "Outcomes for a goal",
		input: {
			kind: "Outcome",
			goal: GOAL,
			inputs: ["Concept document", "Paper map of the island"],
			stage: STAGE,
		},
	},
	{
		id: "outcomes-no-goal",
		label: "Outcomes, the goal still empty",
		input: { kind: "Outcome", goal: "", inputs: [], stage: STAGE },
	},
	{
		id: "inputs",
		label: "Inputs after a closed checkpoint",
		input: {
			kind: "Input",
			project: {
				name: "Hollow Tide",
				description: "A tide-driven exploration game on a drowning island.",
			},
			stage: STAGE,
			previousOutcomes: ["Concept document", "Greybox of the first island"],
		},
	},
];
