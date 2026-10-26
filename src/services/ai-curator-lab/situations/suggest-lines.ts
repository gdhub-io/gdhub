import {
	type LabLanguage,
	type Situation,
	say,
	type suggestLinesInput,
} from "../schemas";
import { hollowTide } from "./hollow-tide";

const TEXT = {
	en: {
		inputs: ["Concept document", "Paper map of the island"],
		previous: ["Concept document", "Greybox of the first island"],
	},
	ru: {
		inputs: ["Концепт-документ", "Бумажная карта острова"],
		previous: ["Концепт-документ", "Серый блокаут первого острова"],
	},
};

export const suggestLinesSituations = (
	language: LabLanguage,
): Situation<typeof suggestLinesInput>[] => {
	const t = TEXT[language];
	const project = hollowTide(language);

	return [
		{
			id: "outcomes",
			label: say(language, "Outcomes for a goal", "Результаты под цель"),
			input: {
				kind: "Outcome",
				goal: project.goal,
				inputs: t.inputs,
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
			id: "inputs",
			label: say(
				language,
				"Inputs after a closed checkpoint",
				"Входные данные после закрытого чекпоинта",
			),
			input: {
				kind: "Input",
				project: { name: "Hollow Tide", description: project.pitch },
				workflow: project.workflow,
				previousOutcomes: t.previous,
			},
		},
	];
};
