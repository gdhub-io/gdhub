import {
	type goalCheckInput,
	type LabLanguage,
	type Situation,
	say,
} from "../schemas";
import { e2eCheckpoint } from "./e2e-test-game";

const TOO_BIG =
	"Release E2E Test Game on Steam: all eight worlds, a boss in each and online co-op";
const TOO_SMALL = "Pick the gnome's colour palette";

/** Day 1 of checkpoint 3, right after payment: the goal as paid for, no tasks yet. */
export const goalCheckSituations = (
	language: LabLanguage,
): Situation<typeof goalCheckInput>[] => {
	const base = e2eCheckpoint(3).goalCheck();
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
			input: withGoal(TOO_BIG),
		},
		{
			id: "too-small",
			label: say(
				language,
				"A goal that asks too little",
				"Цель, которая просит слишком мало",
			),
			input: withGoal(TOO_SMALL),
		},
	];
};
