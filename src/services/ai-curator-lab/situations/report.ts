import {
	type LabLanguage,
	type reportInput,
	type Situation,
	say,
} from "../schemas";
import { hollowTide, PULSE_ROWS } from "./hollow-tide";

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
	},
	ru: {
		demoSeen: "Страница на itch.io с играбельной веб-сборкой острова.",
		boardSeen: "Доска с палитрой и двумя листами персонажей.",
		notesSeen: "Заметки по пяти игрокам, у каждого — на чём застрял.",
		partly: "Заметки по трём игрокам, а не по пяти.",
		other: "Статья Википедии о движке Godot, а не заметки плейтеста.",
		cut: "Плейтест переносим на следующий чекпоинт; сначала баг с мостом.",
	},
};

const LINKS = {
	demo: "https://hollowtide.itch.io/demo",
	board: "https://www.figma.com/board/hollow-tide",
	notes: "https://docs.google.com/document/d/playtest",
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

export const reportSituations = (
	language: LabLanguage,
): Situation<typeof reportInput>[] => {
	const t = TEXT[language];
	const project = hollowTide(language);
	const { outcomes, artifacts, devlogs } = project;

	const demo = outcome(outcomes.demo, {
		evidenceMatch: "Matches",
		evidenceMatchNote: t.demoSeen,
		artifact: artifact("ExecutableBuild", artifacts.demo, LINKS.demo),
	});
	const board = outcome(outcomes.board, {
		evidenceMatch: "Matches",
		evidenceMatchNote: t.boardSeen,
		artifact: artifact("Image", artifacts.board, LINKS.board),
	});
	const playtest = outcome(outcomes.playtest, {
		evidenceMatch: "Matches",
		evidenceMatchNote: t.notesSeen,
		artifact: artifact("Document", artifacts.notes, LINKS.notes),
	});
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
		workflow: project.workflow,
		revision: null,
		items: [
			{ id: "i1", kind: "Input" as const, text: project.input, artifact: null },
			demo,
			board,
			playtest,
		],
		devlogs: [devlog.greybox, devlog.board, devlog.playtest],
		pulses: PULSE_ROWS,
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
					outcome(outcomes.board, {
						artifact: artifact("Image", artifacts.board, LINKS.board, {
							checkStatus: "Unreachable",
							checkNote: "needsLogin",
						}),
					}),
				),
				devlogs: [devlog.greybox, devlog.boardPrivate, devlog.playtest],
			},
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
					artifact: artifact("ExecutableBuild", artifacts.demo, LINKS.demo, {
						checkStatus: "Unreachable",
						checkNote: "notFound",
					}),
				}),
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
			// Cut on day 15: no playtest devlog, no notes.
			id: "cut",
			label: say(
				language,
				"A task cut on day 15",
				"Задачу вычеркнули на 15-й день",
			),
			input: {
				...replacing("o3", outcome(outcomes.playtest, { cut: true })),
				revision: { revisedAt: "2026-10-15", note: t.cut },
				devlogs: [devlog.greybox, devlog.board],
				picture: withoutNotes,
			},
		},
	];
};
