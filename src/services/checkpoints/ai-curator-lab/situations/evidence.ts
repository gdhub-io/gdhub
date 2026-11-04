import {
	type evidenceInput,
	type LabLanguage,
	type Situation,
	say,
} from "../schemas";
import { e2eCheckpoint } from "./e2e-test-game";

const TEXT = {
	notes: `Playtest, Saturday 28 Nov. Five players from a local meetup, 15 minutes each.
- Anna: reached the flag; loved the candy trail.
- Ben: fell into the second pit three times, then made it.
- Chloe: reached the flag; wants to see how many candies are left.
- Dan: stuck at the second pit, quit after 12 minutes.
- Eva: reached the flag; asked for a sound when the jump is buffered.
Top issue: the second pit (3 of 5).`,
	notesSays: "Notes from Saturday's playtest.",
	godot:
		"Godot (game engine). Godot is a cross-platform, free and open-source game engine released under the MIT License.",
	insists:
		"The playtest with five players is done and written up — see the task.",
	recipe: "Our recipes: lemon cake, three eggs, 200 g of flour.",
	video: "Level 1 walkthrough",
	videoText:
		"Video title: E2E Test Game — level 1 walkthrough\nDescription: From the snowy start to the flag: candies, the snowman, the diving crow.",
	repo: "Godot demo projects",
};

export const evidenceSituations = (
	language: LabLanguage,
): Situation<typeof evidenceInput>[] => {
	const cp = e2eCheckpoint(3);
	const [jump, level, , players] = cp.checkpoint.tasks;
	const devlogs = cp.devlogs().map((post) => post.content);
	// Day 28: the playtest notes arrive; the judge reads every devlog so far.
	const playtest = {
		task: players.text,
		artifactType: "Document",
		artifactName: "Playtest notes",
		description: TEXT.notesSays,
		devlogs,
	};
	const text = (body: string | null, unread: string | null = null) => ({
		text: body,
		unread,
	});

	return [
		{
			id: "matches",
			label: say(language, "Matches the task", "Соответствует задаче"),
			input: { ...playtest, evidence: text(TEXT.notes) },
		},
		{
			id: "partly",
			label: say(language, "Shown in part", "Показано частично"),
			input: {
				...playtest,
				evidence: text(TEXT.notes.split("\n").slice(0, 4).join("\n")),
			},
		},
		{
			id: "does-not-match",
			label: say(language, "Not about the task", "Не про задачу"),
			input: { ...playtest, evidence: text(TEXT.godot) },
		},
		{
			id: "devlog-insists",
			label: say(
				language,
				"Not about the task, a devlog says it is done",
				"Не про задачу, а девлог говорит «сделано»",
			),
			input: {
				...playtest,
				devlogs: [...playtest.devlogs, TEXT.insists],
				evidence: text(TEXT.recipe),
			},
		},
		{
			id: "cannot-tell",
			label: say(language, "Nothing readable", "Ничего не прочитать"),
			input: {
				...playtest,
				evidence: text(
					null,
					"a file of a kind the curator cannot read (application/zip)",
				),
			},
		},
		{
			// Day 27: level 1 arrives as a video the curator only sees by its title.
			id: "devlog-explains",
			label: say(
				language,
				"A video only by its title, a devlog explains it",
				"Видео только по названию, девлог поясняет",
			),
			input: {
				task: level.text,
				artifactType: "Video",
				artifactName: TEXT.video,
				description: null,
				devlogs,
				evidence: text(
					TEXT.videoText,
					"a youtube video: only its title and thumbnail, the video itself was not watched",
				),
			},
		},
		{
			// Day 5: a link read live — another team's repository, so not the task.
			id: "live-link",
			label: say(
				language,
				"A real link, read now (another game's repo)",
				"Настоящая ссылка, читается сейчас (репозиторий чужой игры)",
			),
			input: {
				task: jump.text,
				artifactType: "Repository",
				artifactName: TEXT.repo,
				description: null,
				devlogs: cp.devlogs(1).map((post) => post.content),
				evidence: {
					link: "https://github.com/godotengine/godot-demo-projects",
				},
			},
		},
	];
};
