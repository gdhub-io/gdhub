import {
	type LabLanguage,
	type reportInput,
	type Situation,
	say,
} from "../schemas";
import { hollowTide } from "./hollow-tide";

type Item = Situation<typeof reportInput>["input"]["items"][number];

/** Day 29: what the evidence came to, as the earlier checks left it. */
const TEXT = {
	en: {
		demoSeen: "An itch.io page with a playable web build of the island.",
		boardSeen: "A board with a palette and two character sheets.",
		notesSeen: "Notes from five players, each with what they hit.",
		partly: "Notes from three players, not five.",
		other: "A Wikipedia page about the Godot engine, not playtest notes.",
		cut: "The playtest moves to the next checkpoint; the bridge bug comes first.",
		refTasks: [
			"A public repository of the Godot demo projects the game builds on",
			"An animated reference video for the art style",
			"A reference article on what playtesting is, for the team to read",
		],
		refSeen: [
			"The public godotengine/godot-demo-projects repository.",
			"A short animated film used as an art reference.",
			"A Wikipedia article explaining playtesting.",
		],
		warned: [
			"I've checked the tasks against the goal: they collect references, but none produces the playable island. Add a task that builds the beach-to-lighthouse route before you approve.",
			"The repository is in, but nothing playable yet. Next, build the beach-to-lighthouse route and attach a build.",
			"Halfway, still no playable island. Make this the last change: drop the article and publish a build of the route.",
			"The references are complete; the island is still not playable. Put the route on itch.io before the end.",
		],
		ownRoute: ["Book the playtest with five players before anything else."],
		mobileSeen:
			"The island demo running in a phone browser, with touch controls; the route to the lighthouse can be finished.",
		mobileDevlog:
			"Week 3: instead of the desktop playtest we made the demo run on phones and had five friends finish it there.",
	},
	ru: {
		demoSeen: "Страница на itch.io с играбельной веб-сборкой острова.",
		boardSeen: "Доска с палитрой и двумя листами персонажей.",
		notesSeen: "Заметки по пяти игрокам, у каждого — на чём застрял.",
		partly: "Заметки по трём игрокам, а не по пяти.",
		other: "Статья Википедии о движке Godot, а не заметки плейтеста.",
		cut: "Плейтест переносим на следующий чекпоинт; сначала баг с мостом.",
		refTasks: [
			"Публичный репозиторий демо-проектов Godot, на которых строится игра",
			"Анимированное видео-референс для стиля",
			"Справочная статья о том, что такое плейтест, для команды",
		],
		refSeen: [
			"Публичный репозиторий godotengine/godot-demo-projects.",
			"Короткий анимационный фильм как референс стиля.",
			"Статья Википедии о плейтестах.",
		],
		warned: [
			"Сверил задачи с целью: это референсы, ни одна не даёт играбельного острова. Добавьте задачу, которая строит маршрут от пляжа до маяка, прежде чем утверждать.",
			"Репозиторий есть, играбельного пока нет. Дальше — постройте маршрут от пляжа до маяка и приложите сборку.",
			"Половина пути, острова всё ещё нет. Это последняя правка: уберите статью и выложите сборку маршрута.",
			"Референсы собраны, остров по-прежнему не играбелен. Выложите маршрут на itch.io до конца.",
		],
		ownRoute: ["Назначьте плейтест на пять игроков в первую очередь."],
		mobileSeen:
			"Демо острова в браузере телефона с сенсорным управлением; маршрут до маяка проходится.",
		mobileDevlog:
			"Неделя 3: вместо плейтеста на ПК сделали демо для телефонов, и пятеро друзей прошли его там.",
	},
};

const LINKS = {
	demo: "https://hollowtide.itch.io/demo",
	board: "https://www.figma.com/board/hollow-tide",
	notes: "https://docs.google.com/document/d/playtest",
};

type Piece = NonNullable<Item["evidence"]>[number];

const outcome = (
	task: { id: string; text: string },
	...evidence: Piece[]
): Item => ({ ...task, kind: "Outcome", evidence });

/** One artifact offered for a task, with what the AI saw in it. */
const seen = (
	artifact: Piece["artifact"],
	match?: Piece["match"],
	matchNote?: string,
): Piece => ({ artifact, match, matchNote });

const artifact = (
	type: string,
	name: string,
	link: string,
	over: Partial<Piece["artifact"]> = {},
) => ({
	type,
	name,
	description: null,
	link,
	checkStatus: "Readable" as const,
	...over,
});

export const reportSituations = (
	language: LabLanguage,
): Situation<typeof reportInput>[] => {
	const t = TEXT[language];
	const project = hollowTide(language);
	const { outcomes, artifacts, devlogs } = project;

	const demoBuild = artifact("ExecutableBuild", artifacts.demo, LINKS.demo);
	const notes = artifact("Document", artifacts.notes, LINKS.notes);
	const demo = outcome(outcomes.demo, seen(demoBuild, "Matches", t.demoSeen));
	const board = outcome(
		outcomes.board,
		seen(
			artifact("Image", artifacts.board, LINKS.board),
			"Matches",
			t.boardSeen,
		),
	);
	const playtest = outcome(
		outcomes.playtest,
		seen(notes, "Matches", t.notesSeen),
	);
	const devlog = {
		greybox: { publishedAt: "2026-10-05", content: devlogs.greybox },
		board: { publishedAt: "2026-10-19", content: devlogs.styleBoard },
		boardPrivate: {
			publishedAt: "2026-10-19",
			content: devlogs.styleBoardPrivate,
		},
		playtest: { publishedAt: "2026-10-26", content: devlogs.playtest },
	};

	const base = {
		goal: project.goal,
		workflow: project.workflow("end"),
		revision: null,
		items: [
			{ id: "i1", kind: "Input" as const, text: project.input, evidence: [] },
			demo,
			board,
			playtest,
		],
		devlogs: [devlog.greybox, devlog.board, devlog.playtest],
		team: project.team("end"),
		picture: project.picture("end"),
	};
	const replacing = (id: string, item: Item) => ({
		...base,
		items: base.items.map((each) => (each.id === id ? item : each)),
	});
	// No notes were ever attached: the activity never shows them added.
	const withoutNotes = project.picture("end", ["notes"]);

	return [
		{
			id: "all-delivered",
			label: say(language, "All delivered", "Всё сдано"),
			input: base,
		},
		{
			id: "login-devlog",
			label: say(
				language,
				"Behind a login, a devlog describes it",
				"За логином, девлог описывает",
			),
			input: {
				...replacing(
					"o2",
					outcome(
						outcomes.board,
						seen(
							artifact("Image", artifacts.board, LINKS.board, {
								checkStatus: "Unreachable",
								checkNote: "needsLogin",
							}),
						),
					),
				),
				devlogs: [devlog.greybox, devlog.boardPrivate, devlog.playtest],
			},
		},
		{
			id: "partly",
			label: say(language, "Shown in part", "Показано частично"),
			input: replacing(
				"o3",
				outcome(outcomes.playtest, seen(notes, "Partly", t.partly)),
			),
		},
		{
			id: "does-not-match",
			label: say(language, "Not about the task", "Не про задачу"),
			input: replacing(
				"o3",
				outcome(outcomes.playtest, seen(notes, "DoesNotMatch", t.other)),
			),
		},
		{
			id: "broken",
			label: say(language, "Link doesn't open", "Ссылка не открывается"),
			input: replacing(
				"o1",
				outcome(
					outcomes.demo,
					seen({
						...demoBuild,
						checkStatus: "Unreachable",
						checkNote: "notFound",
					}),
				),
			),
		},
		{
			// The playtest ran — the devlog says so — but no notes were attached.
			id: "nothing",
			label: say(language, "Nothing attached", "Ничего не приложено"),
			input: {
				...replacing("o3", outcome(outcomes.playtest)),
				picture: withoutNotes,
			},
		},
		{
			// Every task proven, none of them the goal, after four letters saying so.
			id: "plan-off-goal",
			label: say(
				language,
				"All tasks proven, the goal not shown, advice not taken",
				"Все задачи сданы, цели нет, советы не взяли",
			),
			input: {
				...base,
				journal: t.warned.map((text, index) => ({ day: 1 + index * 7, text })),
				items: [
					base.items[0],
					...t.refTasks.map((text, index) =>
						outcome(
							{ id: `r${index + 1}`, text },
							seen(
								artifact("Other", text, `https://example.com/ref-${index + 1}`),
								"Matches",
								t.refSeen[index],
							),
						),
					),
				],
				devlogs: [],
				picture: project.picture("end", ["demo", "notes"]),
			},
		},
		{
			// The team skipped the advised playtest and went mobile — and the goal is shown.
			id: "own-route",
			label: say(
				language,
				"The team's own route reaches the goal",
				"Свой путь команды дошёл до цели",
			),
			input: {
				...replacing(
					"o3",
					outcome(outcomes.playtest, seen(demoBuild, "Matches", t.mobileSeen)),
				),
				journal: t.ownRoute.map((text) => ({ day: 15, text })),
				devlogs: [
					devlog.greybox,
					devlog.board,
					{ publishedAt: "2026-10-22", content: t.mobileDevlog },
				],
			},
		},
		{
			// Cut on day 15: no playtest devlog, no notes.
			id: "cut",
			label: say(
				language,
				"A task cut on day 15",
				"Задачу вычеркнули на 15-й день",
			),
			input: {
				...replacing("o3", { ...outcome(outcomes.playtest), cut: true }),
				revision: { revisedAt: "2026-10-15", note: t.cut },
				devlogs: [devlog.greybox, devlog.board],
				picture: withoutNotes,
			},
		},
	];
};
