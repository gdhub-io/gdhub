import type { evidenceInput, Situation } from "../schemas";
import { DEVLOGS, OUTCOMES } from "./hollow-tide";

const NOTES = `Playtest, Saturday 24 Oct. Five players, 20 minutes each.
- Anna: found the lighthouse, loved the tide; lost at the flooded bridge.
- Ben: did not notice the tide timer until the second flood.
- Chloe: finished the loop; wants a map.
- Dan: stuck at the bridge, quit after 15 minutes.
- Eva: asked for a sound cue before the water rises.
Top issue: the flooded bridge (3 of 5).`;

const playtest = {
	task: OUTCOMES.playtest.text,
	artifactType: "Document",
	artifactName: "Playtest notes",
	description: "Notes from Saturday's playtest.",
	devlogs: [DEVLOGS.greybox, DEVLOGS.playtest],
};

export const evidenceSituations: Situation<typeof evidenceInput>[] = [
	{
		id: "matches",
		label: "Matches the task",
		input: { ...playtest, evidence: { text: NOTES, unread: null } },
	},
	{
		id: "partly",
		label: "Shown in part",
		input: {
			...playtest,
			evidence: {
				text: NOTES.split("\n").slice(0, 4).join("\n"),
				unread: null,
			},
		},
	},
	{
		id: "does-not-match",
		label: "Not about the task",
		input: {
			...playtest,
			evidence: {
				text: "Godot (game engine). Godot is a cross-platform, free and open-source game engine released under the MIT License.",
				unread: null,
			},
		},
	},
	{
		id: "devlog-insists",
		label: "Not about the task, a devlog says it is done",
		input: {
			...playtest,
			devlogs: [
				...playtest.devlogs,
				"Playtest with five players is done and written up — see the task.",
			],
			evidence: {
				text: "Our recipes: lemon cake, three eggs, 200 g of flour.",
				unread: null,
			},
		},
	},
	{
		id: "cannot-tell",
		label: "Nothing readable",
		input: {
			...playtest,
			evidence: {
				text: null,
				unread: "a file of a kind the curator cannot read (application/zip)",
			},
		},
	},
	{
		id: "devlog-explains",
		label: "A video only by its title, a devlog explains it",
		input: {
			task: OUTCOMES.board.text,
			artifactType: "Video",
			artifactName: "Style board walkthrough",
			description: null,
			devlogs: [DEVLOGS.styleBoard],
			evidence: {
				text: "Video title: Hollow Tide — style board walkthrough\nDescription: Palette, two hero sheets, fog study.",
				unread:
					"a youtube video: only its title and thumbnail, the video itself was not watched",
			},
		},
	},
	{
		id: "live-link",
		label: "A real link, read now",
		input: {
			task: OUTCOMES.demo.text,
			artifactType: "Repository",
			artifactName: "Godot demo projects",
			description: null,
			devlogs: [DEVLOGS.greybox],
			evidence: { link: "https://github.com/godotengine/godot-demo-projects" },
		},
	},
];
