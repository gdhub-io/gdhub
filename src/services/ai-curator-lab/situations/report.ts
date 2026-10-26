import {
	type LabLanguage,
	type reportInput,
	type Situation,
	say,
} from "../schemas";
import { hollowTide } from "./hollow-tide";

type Item = Situation<typeof reportInput>["input"]["items"][number];

const TEXT = {
	en: {
		concept: "Concept document",
		demo: "Island demo 0.3",
		demoSeen: "An itch.io page with a playable web build of the island.",
		board: "Style board",
		boardSeen: "A board with a palette and two character sheets.",
		notes: "Playtest notes",
		notesSeen: "Notes from five players, each with what they hit.",
		partly: "Notes from three players, not five.",
		other: "A Wikipedia page about the Godot engine, not playtest notes.",
		cut: "The playtest moves to the next checkpoint; the bridge bug comes first.",
	},
	ru: {
		concept: "Концепт-документ",
		demo: "Демо острова 0.3",
		demoSeen: "Страница на itch.io с играбельной веб-сборкой острова.",
		board: "Доска стиля",
		boardSeen: "Доска с палитрой и двумя листами персонажей.",
		notes: "Заметки плейтеста",
		notesSeen: "Заметки по пяти игрокам, у каждого — на чём застрял.",
		partly: "Заметки по трём игрокам, а не по пяти.",
		other: "Статья Википедии о движке Godot, а не заметки плейтеста.",
		cut: "Плейтест переносим на следующий чекпоинт; сначала баг с мостом.",
	},
};

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

const LINKS = {
	demo: "https://hollowtide.itch.io/demo",
	board: "https://www.figma.com/board/hollow-tide",
	notes: "https://docs.google.com/document/d/playtest",
};

export const reportSituations = (
	language: LabLanguage,
): Situation<typeof reportInput>[] => {
	const t = TEXT[language];
	const project = hollowTide(language);
	const { outcomes } = project;

	const demo = outcome(outcomes.demo, {
		evidenceMatch: "Matches",
		evidenceMatchNote: t.demoSeen,
		artifact: artifact("ExecutableBuild", t.demo, LINKS.demo),
	});
	const board = outcome(outcomes.board, {
		evidenceMatch: "Matches",
		evidenceMatchNote: t.boardSeen,
		artifact: artifact("Image", t.board, LINKS.board),
	});
	const playtest = outcome(outcomes.playtest, {
		evidenceMatch: "Matches",
		evidenceMatchNote: t.notesSeen,
		artifact: artifact("Document", t.notes, LINKS.notes),
	});

	const base = {
		goal: project.goal,
		workflow: project.workflow,
		revision: null,
		items: [
			{ id: "i1", kind: "Input" as const, text: t.concept, artifact: null },
			demo,
			board,
			playtest,
		],
		devlogs: [
			{ publishedAt: "2026-10-05", content: project.devlogs.greybox },
			{ publishedAt: "2026-10-19", content: project.devlogs.styleBoard },
			{ publishedAt: "2026-10-26", content: project.devlogs.playtest },
		],
		pulses: [
			{ member: "Marta", weeks: [true, true, true, true] },
			{ member: "Tom", weeks: [true, false, true, true] },
			{ member: "Ivo", weeks: [true, true, false, true] },
		],
		picture: project.pictureAtEnd,
	};
	const replacing = (id: string, item: Item) => ({
		...base,
		items: base.items.map((each) => (each.id === id ? item : each)),
	});

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
			input: replacing(
				"o2",
				outcome(outcomes.board, {
					artifact: artifact("Image", t.board, LINKS.board, {
						checkStatus: "Unreachable",
						checkNote: "needsLogin",
					}),
				}),
			),
		},
		{
			id: "partly",
			label: say(language, "Shown in part", "Показано частично"),
			input: replacing("o3", {
				...playtest,
				evidenceMatch: "Partly",
				evidenceMatchNote: t.partly,
			}),
		},
		{
			id: "does-not-match",
			label: say(language, "Not about the task", "Не про задачу"),
			input: replacing("o3", {
				...playtest,
				evidenceMatch: "DoesNotMatch",
				evidenceMatchNote: t.other,
			}),
		},
		{
			id: "broken",
			label: say(language, "Link doesn't open", "Ссылка не открывается"),
			input: replacing(
				"o1",
				outcome(outcomes.demo, {
					artifact: artifact("ExecutableBuild", t.demo, LINKS.demo, {
						checkStatus: "Unreachable",
						checkNote: "notFound",
					}),
				}),
			),
		},
		{
			id: "nothing",
			label: say(language, "Nothing attached", "Ничего не приложено"),
			input: replacing("o3", outcome(outcomes.playtest)),
		},
		{
			id: "cut",
			label: say(
				language,
				"A task cut on day 15",
				"Задачу вычеркнули на 15-й день",
			),
			input: {
				...replacing("o3", outcome(outcomes.playtest, { cut: true })),
				revision: { revisedAt: "2026-10-15", note: t.cut },
			},
		},
	];
};
