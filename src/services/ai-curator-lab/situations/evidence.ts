import {
	type evidenceInput,
	type LabLanguage,
	type Situation,
	say,
} from "../schemas";
import { hollowTide } from "./hollow-tide";

const TEXT = {
	en: {
		notes: `Playtest, Saturday 24 Oct. Five players, 20 minutes each.
- Anna: found the lighthouse, loved the tide; lost at the flooded bridge.
- Ben: did not notice the tide timer until the second flood.
- Chloe: finished the loop; wants a map.
- Dan: stuck at the bridge, quit after 15 minutes.
- Eva: asked for a sound cue before the water rises.
Top issue: the flooded bridge (2 of 5).`,
		notesSays: "Notes from Saturday's playtest.",
		godot:
			"Godot (game engine). Godot is a cross-platform, free and open-source game engine released under the MIT License.",
		insists:
			"Playtest with five players is done and written up — see the task.",
		recipe: "Our recipes: lemon cake, three eggs, 200 g of flour.",
		video: "Style board walkthrough",
		videoText:
			"Video title: Hollow Tide — style board walkthrough\nDescription: Palette, two hero sheets, fog study.",
		repo: "Godot demo projects",
	},
	ru: {
		notes: `Плейтест, суббота 24 октября. Пять игроков, по 20 минут.
- Аня: нашла маяк, понравился прилив; потерялась у затопленного моста.
- Борис: не замечал таймер прилива до второго затопления.
- Вика: прошла цикл целиком; просит карту.
- Денис: застрял у моста, бросил через 15 минут.
- Ева: просит звуковой сигнал перед подъёмом воды.
Главная проблема: затопленный мост (2 из 5).`,
		notesSays: "Заметки с субботнего плейтеста.",
		godot:
			"Godot (игровой движок). Godot — кроссплатформенный, свободный игровой движок с открытым исходным кодом под лицензией MIT.",
		insists: "Плейтест на пять игроков проведён и записан — смотрите задачу.",
		recipe: "Наши рецепты: лимонный пирог, три яйца, 200 г муки.",
		video: "Разбор доски стиля",
		videoText:
			"Название видео: Hollow Tide — разбор доски стиля\nОписание: палитра, два листа героев, этюд тумана.",
		repo: "Демо-проекты Godot",
	},
};

export const evidenceSituations = (
	language: LabLanguage,
): Situation<typeof evidenceInput>[] => {
	const t = TEXT[language];
	const project = hollowTide(language);
	const { devlogs, outcomes, artifacts } = project;
	// Day 26: the playtest notes arrive; the judge reads every devlog so far.
	const playtest = {
		task: outcomes.playtest.text,
		artifactType: "Document",
		artifactName: artifacts.notes,
		description: t.notesSays,
		devlogs: [devlogs.greybox, devlogs.styleBoard, devlogs.playtest],
	};
	const text = (body: string | null, unread: string | null = null) => ({
		text: body,
		unread,
	});

	return [
		{
			id: "matches",
			label: say(language, "Matches the task", "Соответствует задаче"),
			input: { ...playtest, evidence: text(t.notes) },
		},
		{
			id: "partly",
			label: say(language, "Shown in part", "Показано частично"),
			input: {
				...playtest,
				evidence: text(t.notes.split("\n").slice(0, 4).join("\n")),
			},
		},
		{
			id: "does-not-match",
			label: say(language, "Not about the task", "Не про задачу"),
			input: { ...playtest, evidence: text(t.godot) },
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
				devlogs: [...playtest.devlogs, t.insists],
				evidence: text(t.recipe),
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
			// Day 19: the board arrives as a video the curator only sees by its title.
			id: "devlog-explains",
			label: say(
				language,
				"A video only by its title, a devlog explains it",
				"Видео только по названию, девлог поясняет",
			),
			input: {
				task: outcomes.board.text,
				artifactType: "Video",
				artifactName: t.video,
				description: null,
				devlogs: [devlogs.greybox, devlogs.styleBoard],
				evidence: text(
					t.videoText,
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
				task: outcomes.demo.text,
				artifactType: "Repository",
				artifactName: t.repo,
				description: null,
				devlogs: [devlogs.greybox],
				evidence: {
					link: "https://github.com/godotengine/godot-demo-projects",
				},
			},
		},
	];
};
