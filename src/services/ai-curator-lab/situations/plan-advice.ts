import type { planAdviceInput, Situation } from "../schemas";
import { GOAL, OUTCOMES, PICTURE, STAGE } from "./hollow-tide";

const open = (task: { id: string; text: string }) => ({
	...task,
	done: null,
	cut: false,
	firstWording: null,
	seen: null,
});

export const planAdviceSituations: Situation<typeof planAdviceInput>[] = [
	{
		id: "start",
		label: "Day 1, the plan as bought",
		input: {
			goal: GOAL,
			stage: STAGE.name,
			tasks: [
				...Object.values(OUTCOMES).map(open),
				open({ id: "o4", text: "Polish" }),
			],
			moment: "start",
			review: null,
			picture: PICTURE,
		},
	},
	{
		id: "midway",
		label: "Day 15, behind on the playtest",
		input: {
			goal: GOAL,
			stage: STAGE.name,
			tasks: [
				{
					...open(OUTCOMES.demo),
					done: { type: "ExecutableBuild", name: "Island demo 0.2" },
					seen: {
						match: "Matches",
						note: "An itch.io page with a playable web build of the island.",
					},
				},
				open(OUTCOMES.board),
				open(OUTCOMES.playtest),
			],
			moment: "midway",
			review:
				"Sprint 1 landed the greybox. Sprint 2 went to bug fixing; nothing was shown for the art or the playtest.",
			picture: PICTURE,
		},
	},
];
