import type { reportInput, Situation } from "../schemas";
import { DEVLOGS, GOAL, OUTCOMES, PICTURE, STAGE } from "./hollow-tide";

type Item = Situation<typeof reportInput>["input"]["items"][number];

const outcome = (
	task: { id: string; text: string },
	over: Partial<Item> = {},
): Item => ({ ...task, kind: "Outcome", artifact: null, ...over });

const artifact = (
	type: string,
	name: string,
	link: string,
	over: Partial<NonNullable<Item["artifact"]>> = {},
) => ({
	type,
	name,
	description: null,
	link,
	checkStatus: "Readable" as const,
	...over,
});

const demo = outcome(OUTCOMES.demo, {
	evidenceMatch: "Matches",
	evidenceMatchNote: "An itch.io page with a playable web build of the island.",
	artifact: artifact(
		"ExecutableBuild",
		"Island demo 0.3",
		"https://hollowtide.itch.io/demo",
	),
});
const board = outcome(OUTCOMES.board, {
	evidenceMatch: "Matches",
	evidenceMatchNote: "A board with a palette and two character sheets.",
	artifact: artifact(
		"Image",
		"Style board",
		"https://www.figma.com/board/hollow-tide",
	),
});
const playtest = outcome(OUTCOMES.playtest, {
	evidenceMatch: "Matches",
	evidenceMatchNote: "Notes from five players, each with what they hit.",
	artifact: artifact(
		"Document",
		"Playtest notes",
		"https://docs.google.com/document/d/playtest",
	),
});

const base = {
	goal: GOAL,
	stage: STAGE,
	revision: null,
	items: [
		{
			id: "i1",
			kind: "Input" as const,
			text: "Concept document",
			artifact: null,
		},
		demo,
		board,
		playtest,
	],
	devlogs: [
		{ publishedAt: "2026-10-05", content: DEVLOGS.greybox },
		{ publishedAt: "2026-10-19", content: DEVLOGS.styleBoard },
		{ publishedAt: "2026-10-26", content: DEVLOGS.playtest },
	],
	pulses: [
		{ member: "Marta", weeks: [true, true, true, true] },
		{ member: "Tom", weeks: [true, false, true, true] },
		{ member: "Ivo", weeks: [true, true, false, true] },
	],
	picture: PICTURE,
};

const replacing = (id: string, item: Item) => ({
	...base,
	items: base.items.map((each) => (each.id === id ? item : each)),
});

export const reportSituations: Situation<typeof reportInput>[] = [
	{ id: "all-delivered", label: "All delivered", input: base },
	{
		id: "login-devlog",
		label: "Behind a login, a devlog describes it",
		input: replacing(
			"o2",
			outcome(OUTCOMES.board, {
				artifact: artifact(
					"Image",
					"Style board",
					"https://www.figma.com/board/hollow-tide",
					{
						checkStatus: "Unreachable",
						checkNote: "needsLogin",
					},
				),
			}),
		),
	},
	{
		id: "partly",
		label: "Shown in part",
		input: replacing("o3", {
			...playtest,
			evidenceMatch: "Partly",
			evidenceMatchNote: "Notes from three players, not five.",
		}),
	},
	{
		id: "does-not-match",
		label: "Not about the task",
		input: replacing("o3", {
			...playtest,
			evidenceMatch: "DoesNotMatch",
			evidenceMatchNote:
				"A Wikipedia page about the Godot engine, not playtest notes.",
		}),
	},
	{
		id: "broken",
		label: "Link doesn't open",
		input: replacing(
			"o1",
			outcome(OUTCOMES.demo, {
				artifact: artifact(
					"ExecutableBuild",
					"Island demo 0.3",
					"https://hollowtide.itch.io/demo",
					{
						checkStatus: "Unreachable",
						checkNote: "notFound",
					},
				),
			}),
		),
	},
	{
		id: "nothing",
		label: "Nothing attached",
		input: replacing("o3", outcome(OUTCOMES.playtest)),
	},
	{
		id: "cut",
		label: "A task cut on day 15",
		input: {
			...replacing("o3", outcome(OUTCOMES.playtest, { cut: true })),
			revision: {
				revisedAt: "2026-10-15",
				note: "The playtest moves to the next checkpoint; the bridge bug comes first.",
			},
		},
	},
];
