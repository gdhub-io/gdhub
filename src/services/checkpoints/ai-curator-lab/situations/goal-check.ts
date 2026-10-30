import {
	type goalCheckInput,
	type LabLanguage,
	type Situation,
	say,
} from "../schemas";
import { hollowTide } from "./hollow-tide";

/** Day 1, right after payment: the goal as paid for, no tasks yet. */
const TEXT = {
	en: {
		experience: "Two jam games, one shipped mobile puzzle.",
		tooBig:
			"Release Hollow Tide on Steam: all five islands, online co-op and a trailer",
		tooSmall: "Pick a colour palette for the first island",
	},
	ru: {
		experience: "Две игры с джемов, одна вышедшая мобильная головоломка.",
		tooBig:
			"Выпустить Hollow Tide в Steam: все пять островов, онлайн-кооператив и трейлер",
		tooSmall: "Подобрать палитру для первого острова",
	},
};

export const goalCheckSituations = (
	language: LabLanguage,
): Situation<typeof goalCheckInput>[] => {
	const t = TEXT[language];
	const project = hollowTide(language);
	const base = {
		card: {
			goal: project.goal,
			inputs: [{ id: "i1", text: project.input }],
			outcomes: [],
		},
		workflow: project.workflow("start"),
		project: { name: "Hollow Tide", pitch: project.pitch, genre: "Adventure" },
		author: {
			speciality: "Game designer",
			level: "Middle",
			experience: t.experience,
		},
		team: project.team("start"),
		previous: null,
		picture: project.picture("start"),
		marketing: project.marketing("start"),
	};
	const withGoal = (goal: string) => ({
		...base,
		card: { ...base.card, goal },
	});

	return [
		{
			id: "fits",
			label: say(
				language,
				"A goal that fits four weeks",
				"Цель, которая влезает в четыре недели",
			),
			input: base,
		},
		{
			id: "too-big",
			label: say(
				language,
				"A goal far bigger than four weeks",
				"Цель намного больше четырёх недель",
			),
			input: withGoal(t.tooBig),
		},
		{
			id: "too-small",
			label: say(
				language,
				"A goal that asks too little",
				"Цель, которая просит слишком мало",
			),
			input: withGoal(t.tooSmall),
		},
	];
};
