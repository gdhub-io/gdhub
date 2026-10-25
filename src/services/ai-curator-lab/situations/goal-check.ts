import type { goalCheckInput, Situation } from "../schemas";
import { GOAL, OUTCOMES, PICTURE, STAGE } from "./hollow-tide";

const base = {
	card: {
		goal: GOAL,
		inputs: [
			{ id: "i1", text: "Concept document and a paper map of the island" },
		],
		outcomes: Object.values(OUTCOMES),
	},
	stage: STAGE,
	project: {
		name: "Hollow Tide",
		pitch: "A tide-driven exploration game on a drowning island.",
		genre: "Adventure",
	},
	author: {
		speciality: "Game designer",
		level: "Middle",
		experience: "Two jam games, one shipped mobile puzzle.",
	},
	team: {
		members: 3,
		stated: 2,
		hoursPerWeek: { from: 30, to: 40 },
		hoursPerRun: { from: 120, to: 160 },
	},
	previous: null,
	picture: PICTURE,
};

export const goalCheckSituations: Situation<typeof goalCheckInput>[] = [
	{ id: "fits", label: "Fits the time the team has", input: base },
	{
		id: "too-much",
		label: "Promises more than four weeks hold",
		input: {
			...base,
			card: {
				...base.card,
				outcomes: [
					...base.card.outcomes,
					{ id: "o4", text: "All five islands playable" },
					{ id: "o5", text: "Steam page live with a trailer" },
					{ id: "o6", text: "Online co-op for two players" },
				],
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
		label: "Tasks nobody could check",
		input: {
			...base,
			card: {
				...base.card,
				outcomes: [
					{ id: "o1", text: "Make the game more fun" },
					{ id: "o2", text: "Work on the art" },
				],
			},
		},
	},
];
