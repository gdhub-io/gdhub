import {
	type LabLanguage,
	type planAdviceInput,
	type Situation,
	say,
} from "../schemas";
import { hollowTide } from "./hollow-tide";

const TEXT = {
	en: {
		polish: "Polish",
		demo: "Island demo 0.2",
		seen: "An itch.io page with a playable web build of the island.",
		review:
			"Sprint 1 landed the greybox. Sprint 2 went to bug fixing; nothing was shown for the art or the playtest.",
	},
	ru: {
		polish: "Полировка",
		demo: "Демо острова 0.2",
		seen: "Страница на itch.io с играбельной веб-сборкой острова.",
		review:
			"Спринт 1 дал серый блокаут. Спринт 2 ушёл на исправление багов; по арту и плейтесту ничего не показано.",
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
	const base = {
		goal: project.goal,
		stage: project.workflow.currentStage,
		picture: project.picture,
	};

	return [
		{
			id: "start",
			label: say(
				language,
				"Day 1, the plan as bought",
				"День 1, план как купили",
			),
			input: {
				...base,
				tasks: [demo, board, playtest, { id: "o4", text: t.polish }].map(open),
				moment: "start",
				review: null,
			},
		},
		{
			id: "midway",
			label: say(
				language,
				"Day 15, behind on the playtest",
				"День 15, отстают с плейтестом",
			),
			input: {
				...base,
				tasks: [
					{
						...open(demo),
						done: { type: "ExecutableBuild", name: t.demo },
						seen: { match: "Matches", note: t.seen },
					},
					open(board),
					open(playtest),
				],
				moment: "midway",
				review: t.review,
			},
		},
	];
};
