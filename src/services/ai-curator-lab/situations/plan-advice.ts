import {
	type LabLanguage,
	type planAdviceInput,
	type Situation,
	say,
} from "../schemas";
import { hollowTide } from "./hollow-tide";

const TEXT = {
	en: {
		tooMuch: ["All five islands playable", "Online co-op for two players"],
		vague: ["Make the game more fun", "Work on the art"],
		seen: "An itch.io page with a playable web build of the island.",
		review:
			"Sprint 1 landed the island demo. Sprint 2 showed nothing: no devlog, no artifact, and the artist did not confirm the week.",
	},
	ru: {
		tooMuch: ["Все пять островов играбельны", "Онлайн-кооператив на двоих"],
		vague: ["Сделать игру интереснее", "Поработать над артом"],
		seen: "Страница на itch.io с играбельной веб-сборкой острова.",
		review:
			"Спринт 1 дал демо острова. Спринт 2 ничего не показал: ни девлога, ни артефакта, а художник не подтвердил неделю.",
	},
};

const open = (task: { id: string; text: string }) => ({
	...task,
	done: null,
	cut: false,
	firstWording: null,
	seen: null,
});

const written = (texts: string[], from: number) =>
	texts.map((text, index) => open({ id: `o${from + index}`, text }));

/** Day 1: the tasks the author wrote after the first letter and sent for the one check. */
export const tasksCheckSituations = (
	language: LabLanguage,
): Situation<typeof planAdviceInput>[] => {
	const t = TEXT[language];
	const project = hollowTide(language);
	const { demo, board, playtest } = project.outcomes;
	const start = {
		goal: project.goal,
		workflow: project.workflow("start"),
		team: project.team("start"),
		tasks: [demo, board, playtest].map(open),
		moment: "start" as const,
		review: null,
		picture: project.picture("start"),
	};

	return [
		{
			id: "fits",
			label: say(
				language,
				"Tasks that fit the goal",
				"Задачи, которые подходят цели",
			),
			input: start,
		},
		{
			id: "too-much",
			label: say(
				language,
				"More tasks than four weeks hold",
				"Задач больше, чем влезет в четыре недели",
			),
			input: { ...start, tasks: [...start.tasks, ...written(t.tooMuch, 4)] },
		},
		{
			id: "vague",
			label: say(
				language,
				"Tasks nobody could check",
				"Задачи, которые никто не проверит",
			),
			input: { ...start, tasks: written(t.vague, 1) },
		},
	];
};

/** Day 15: after the sprint 2 review, the last change to the tasks. */
export const planAdviceSituations = (
	language: LabLanguage,
): Situation<typeof planAdviceInput>[] => {
	const t = TEXT[language];
	const project = hollowTide(language);
	const { demo, board, playtest } = project.outcomes;

	return [
		{
			id: "midway",
			label: say(
				language,
				"Day 15, nothing shown in sprint 2",
				"День 15, спринт 2 ничего не показал",
			),
			input: {
				goal: project.goal,
				workflow: project.workflow("midway"),
				team: project.team("midway"),
				tasks: [
					{
						...open(demo),
						done: { type: "ExecutableBuild", name: project.artifacts.demo },
						seen: { match: "Matches", note: t.seen },
					},
					open(board),
					open(playtest),
				],
				moment: "midway",
				review: t.review,
				picture: project.picture("midway"),
			},
		},
	];
};
