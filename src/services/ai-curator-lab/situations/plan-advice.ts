import {
	type LabLanguage,
	type planAdviceInput,
	type Situation,
	say,
} from "../schemas";
import { hollowTide } from "./hollow-tide";

const TEXT = {
	en: {
		seen: "An itch.io page with a playable web build of the island.",
		review:
			"Sprint 1 landed the island demo. Sprint 2 showed nothing: no devlog, no artifact, and the artist did not confirm the week.",
	},
	ru: {
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

export const planAdviceSituations = (
	language: LabLanguage,
): Situation<typeof planAdviceInput>[] => {
	const t = TEXT[language];
	const project = hollowTide(language);
	const { demo, board, playtest } = project.outcomes;

	return [
		{
			id: "start",
			label: say(
				language,
				"Day 1, the plan as bought",
				"День 1, план как купили",
			),
			input: {
				goal: project.goal,
				workflow: project.workflow("start"),
				tasks: [demo, board, playtest].map(open),
				moment: "start",
				review: null,
				picture: project.picture("start"),
			},
		},
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
