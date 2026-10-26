import { CURATOR_STAGE_BRIEFS } from "@/config/checkpoint";
import type { LabLanguage } from "../schemas";

/**
 * The one project every situation is about, on one timeline, so each call sees
 * only what existed on its day: Hollow Tide, a small team building its first
 * island, in a checkpoint from 1 to 28 October 2026.
 *
 * - Lead-in: Marta adds the concept (20 Sep), Ivo joins (28 Sep).
 * - Sprint 1: the greybox devlog and "Island demo 0.1" (5 Oct). All worked.
 * - Sprint 2: nothing shown; Tom did not confirm the week.
 * - Sprint 3: the style board devlog and board (19 Oct); Ivo did not confirm.
 * - Sprint 4: the playtest devlog and notes (26 Oct). All worked.
 *
 * In Russian, what the team wrote is Russian and what the platform writes —
 * the stage, the picture's headings, roles — stays as production writes it.
 */

/**
 * The Prototyping stage of the Default workflow, as its template stands
 * (2026-10-26). Its one required task is done by the greybox devlog of 5 Oct.
 */
const workflowAt = (moment: Moment) => ({
	currentStage: "Prototyping",
	nextStage: "Preparing a demo version",
	description: CURATOR_STAGE_BRIEFS.Prototyping,
	requiredTasks: [
		{
			name: "Publish a devlog about the prototype",
			done: MOMENTS[moment].to >= "2026-10-05",
		},
	],
});

const TEXT = {
	en: {
		goal: "A playable vertical slice of the first island",
		pitch: "A tide-driven exploration game on a drowning island.",
		input: "Concept document and a paper map of the island",
		artifacts: {
			concept: "Concept document",
			demo: "Island demo 0.1",
			board: "Style board",
			notes: "Playtest notes",
		},
		devlogs: {
			greybox:
				"Week 1: greybox of the island is in. You can walk from the beach to the lighthouse, the tide rises every two minutes and floods the lower paths. Build is on itch.io.",
			styleBoard:
				"Week 3: the art style board is up — palette, two hero sheets and a fog study. The link is on the task.",
			styleBoardPrivate:
				"Week 3: the art style board is in Figma — palette, two hero sheets and a fog study. The board is private for now; the link is on the task.",
			playtest:
				"Week 4: playtest on Saturday. Five players, 20 minutes each; two got stuck at the flooded bridge. Notes are in the doc.",
		},
		outcomes: {
			demo: { id: "o1", text: "Playable island demo on itch.io" },
			board: { id: "o2", text: "Art style board: palette and two hero sheets" },
			playtest: { id: "o3", text: "Playtest with 5 players, notes written up" },
		},
	},
	ru: {
		goal: "Играбельный вертикальный срез первого острова",
		pitch: "Исследование тонущего острова, где всё решает прилив.",
		input: "Концепт-документ и бумажная карта острова",
		artifacts: {
			concept: "Концепт-документ",
			demo: "Демо острова 0.1",
			board: "Доска стиля",
			notes: "Заметки плейтеста",
		},
		devlogs: {
			greybox:
				"Неделя 1: серый блокаут острова готов. Можно дойти от пляжа до маяка, прилив поднимается каждые две минуты и затапливает нижние тропы. Сборка на itch.io.",
			styleBoard:
				"Неделя 3: доска стиля готова — палитра, два листа главных героев и этюд тумана. Ссылка в задаче.",
			styleBoardPrivate:
				"Неделя 3: доска стиля в Figma — палитра, два листа главных героев и этюд тумана. Доска пока закрытая, ссылка в задаче.",
			playtest:
				"Неделя 4: плейтест в субботу. Пять игроков по 20 минут, двое застряли у затопленного моста. Заметки в документе.",
		},
		outcomes: {
			demo: { id: "o1", text: "Играбельное демо острова на itch.io" },
			board: {
				id: "o2",
				text: "Доска стиля: палитра и два листа главных героев",
			},
			playtest: { id: "o3", text: "Плейтест на 5 игроков, заметки записаны" },
		},
	},
};

type Artifacts = (typeof TEXT)["en"]["artifacts"];

/** Who confirmed each week, by member. */
const PULSE = {
	Marta: [true, true, true, true],
	Tom: [true, false, true, true],
	Ivo: [true, true, false, true],
};

const MEMBERS = [
	{ name: "Marta", role: "Game designer", line: "Middle, 20–25 h/week stated" },
	{ name: "Tom", role: "Artist", line: "Junior, 10–15 h/week stated" },
	{ name: "Ivo", role: "Programmer", line: "Middle, hours not stated" },
] as const;

/** What happened, oldest first, as the activity feed words it. */
const events = (a: Artifacts) => [
	{ on: "2026-09-20", line: `Marta added "${a.concept}"` },
	{ on: "2026-09-28", line: "Ivo joined as Programmer" },
	{ on: "2026-10-05", line: `Marta added "${a.demo}"` },
	{ on: "2026-10-19", line: `Tom added "${a.board}"` },
	{ on: "2026-10-26", line: `Marta added "${a.notes}"` },
];

/** The moments a call reads the project at, with the period production picks for each. */
const MOMENTS = {
	/** Day 1, the goal check and the start's advice: the two weeks that led in. */
	start: { from: "2026-09-17", to: "2026-10-01", weeks: 0 },
	sprint1: { from: "2026-10-01", to: "2026-10-07", weeks: 1 },
	sprint2: { from: "2026-10-08", to: "2026-10-14", weeks: 2 },
	/** Day 15's advice reads the run so far. */
	midway: { from: "2026-10-01", to: "2026-10-14", weeks: 2 },
	/** Day 29, the final review and the report: the whole run. */
	end: { from: "2026-10-01", to: "2026-10-28", weeks: 4 },
} as const;

export type Moment = keyof typeof MOMENTS;

/**
 * The project as `projectPicture` writes it at a moment: the team with the
 * weeks already behind, and what happened in the period.
 * `without` drops artifacts a situation never had.
 */
const pictureAt = (
	a: Artifacts,
	moment: Moment,
	without: (keyof Artifacts)[] = [],
) => {
	const { from, to, weeks } = MOMENTS[moment];
	const team = MEMBERS.map(({ name, role, line }) => {
		const worked = PULSE[name]
			.slice(0, weeks)
			.map((ok, week) => `week ${week + 1} ${ok ? "worked" : "not confirmed"}`);
		return `- ${name}: ${role}, ${line}${worked.length ? `; ${worked.join(", ")}` : ""}`;
	});
	const dropped = without.map((key) => `"${a[key]}"`);
	const happened = events(a)
		.filter((event) => event.on >= from && event.on <= to)
		.filter((event) => !dropped.some((name) => event.line.includes(name)))
		.map((event) => `- ${event.on} · ${event.line}`);

	// Day 1 reads the lead-in, and says so.
	const period =
		moment === "start"
			? `in the two weeks before the checkpoint started, from ${from} to ${to}`
			: `from ${from} to ${to}`;

	return [
		`Team (${MEMBERS.length}):`,
		...team,
		"",
		happened.length
			? `What happened on the project ${period}:\n${happened.join("\n")}`
			: `Nothing else happened on the project ${period}.`,
	].join("\n");
};

/** The roles that confirmed working in a week, and the roles that did not. */
export const pulseOf = (week: number) => ({
	worked: MEMBERS.filter(({ name }) => PULSE[name][week - 1]).map(
		({ role }) => role,
	),
	missing: MEMBERS.filter(({ name }) => !PULSE[name][week - 1]).map(
		({ role }) => role,
	),
});

/** The pulse matrix as the report reads it: member by week. */
export const PULSE_ROWS = MEMBERS.map(({ name }) => ({
	member: name,
	weeks: PULSE[name],
}));

export const hollowTide = (language: LabLanguage) => {
	const text = TEXT[language];
	return {
		...text,
		workflow: workflowAt,
		picture: (moment: Moment, without?: (keyof Artifacts)[]) =>
			pictureAt(text.artifacts, moment, without),
	};
};
