import {
	type LabLanguage,
	type Situation,
	say,
	type suggestLinesInput,
} from "../schemas";
import { hollowTide } from "./hollow-tide";

export const suggestLinesSituations = (
	language: LabLanguage,
): Situation<typeof suggestLinesInput>[] => {
	const project = hollowTide(language);

	return [
		{
			id: "outcomes",
			label: say(language, "Outcomes for a goal", "Результаты под цель"),
			input: {
				kind: "Outcome",
				goal: project.goal,
				inputs: [project.input],
				workflow: project.workflow,
			},
		},
		{
			id: "outcomes-no-goal",
			label: say(
				language,
				"Outcomes, the goal still empty",
				"Результаты, цель ещё пустая",
			),
			input: {
				kind: "Outcome",
				goal: "",
				inputs: [],
				workflow: project.workflow,
			},
		},
		{
			// The next checkpoint's draft: this one's outcomes are what exists now.
			id: "inputs",
			label: say(
				language,
				"Inputs after this checkpoint closed",
				"Входные данные после этого чекпоинта",
			),
			input: {
				kind: "Input",
				project: { name: "Hollow Tide", description: project.pitch },
				workflow: project.workflow,
				previousOutcomes: Object.values(project.outcomes).map(
					(outcome) => outcome.text,
				),
			},
		},
	];
};
