import {
	type LabLanguage,
	type planAdviceInput,
	type Situation,
	say,
} from "../schemas";
import { e2eCheckpoint, openTask } from "./e2e-test-game";

const TOO_MUCH = ["All eight worlds playable", "Online co-op for two players"];
const VAGUE = ["Make the jump feel better", "Work on the art"];
const REVIEW =
	"Sprint 1 landed the jump test. Sprint 2 went into a title screen and a logo instead of the level, and Bo cut his hours.";

const written = (texts: string[]) =>
	texts.map((text, index) => openTask({ id: `w${index + 1}`, text }));

/** Day 1 of checkpoint 3: the tasks the author wrote after the first letter and sent for the one check. */
export const tasksCheckSituations = (
	language: LabLanguage,
): Situation<typeof planAdviceInput>[] => {
	const start = e2eCheckpoint(3).tasksCheck();

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
			input: { ...start, tasks: [...start.tasks, ...written(TOO_MUCH)] },
		},
		{
			id: "vague",
			label: say(
				language,
				"Tasks nobody could check",
				"Задачи, которые никто не проверит",
			),
			input: { ...start, tasks: written(VAGUE) },
		},
	];
};

/** Day 15 of checkpoint 3: after the sprint 2 review, the last change to the tasks. */
export const planAdviceSituations = (
	language: LabLanguage,
): Situation<typeof planAdviceInput>[] => [
	{
		id: "midway",
		label: say(
			language,
			"Day 15, sprint 2 went into a title screen",
			"День 15, спринт 2 ушёл в титульный экран",
		),
		input: e2eCheckpoint(3).planAdvice(REVIEW),
	},
];
