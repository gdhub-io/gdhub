import {
	type goalCheckInput,
	type LabLanguage,
	type Situation,
	say,
} from "../schemas";
import { hollowTide } from "./hollow-tide";

const TEXT = {
	en: {
		input: "Concept document and a paper map of the island",
		experience: "Two jam games, one shipped mobile puzzle.",
		tooMuch: [
			"All five islands playable",
			"Steam page live with a trailer",
			"Online co-op for two players",
		],
		vague: ["Make the game more fun", "Work on the art"],
	},
	ru: {
		input: "Концепт-документ и бумажная карта острова",
		experience: "Две игры с джемов, одна вышедшая мобильная головоломка.",
		tooMuch: [
			"Все пять островов играбельны",
			"Страница в Steam с трейлером",
			"Онлайн-кооператив на двоих",
		],
		vague: ["Сделать игру интереснее", "Поработать над артом"],
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
			inputs: [{ id: "i1", text: t.input }],
			outcomes: Object.values(project.outcomes),
		},
		workflow: project.workflow,
		project: { name: "Hollow Tide", pitch: project.pitch, genre: "Adventure" },
		author: {
			speciality: "Game designer",
			level: "Middle",
			experience: t.experience,
		},
		team: {
			members: 3,
			stated: 2,
			hoursPerWeek: { from: 30, to: 40 },
			hoursPerRun: { from: 120, to: 160 },
		},
		previous: null,
		picture: project.picture,
	};
	const outcomes = (texts: string[], from: number) =>
		texts.map((text, index) => ({ id: `o${from + index}`, text }));

	return [
		{
			id: "fits",
			label: say(
				language,
				"Fits the time the team has",
				"Укладывается во время команды",
			),
			input: base,
		},
		{
			id: "too-much",
			label: say(
				language,
				"Promises more than four weeks hold",
				"Обещает больше, чем влезет в четыре недели",
			),
			input: {
				...base,
				card: {
					...base.card,
					outcomes: [...base.card.outcomes, ...outcomes(t.tooMuch, 4)],
				},
				team: {
					members: 1,
					stated: 1,
					hoursPerWeek: { from: 5, to: 8 },
					hoursPerRun: { from: 20, to: 32 },
				},
			},
		},
		{
			id: "vague",
			label: say(
				language,
				"Tasks nobody could check",
				"Задачи, которые никто не проверит",
			),
			input: {
				...base,
				card: { ...base.card, outcomes: outcomes(t.vague, 1) },
			},
		},
	];
};
