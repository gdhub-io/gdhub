import { CURATOR_STAGE_BRIEFS, CURATOR_STAGE_GOALS } from "@/config/checkpoint";
import { lensWeights } from "@/lib/checkpoints/lenses";
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
	goal: CURATOR_STAGE_GOALS.Prototyping,
	lenses: lensWeights("Prototyping"),
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
	{
		name: "Marta",
		role: "Game designer",
		level: "Middle",
		hoursPerWeek: { from: 20, to: 25 },
	},
	{
		name: "Tom",
		role: "Artist",
		level: "Junior",
		hoursPerWeek: { from: 10, to: 15 },
	},
	{ name: "Ivo", role: "Programmer", level: "Middle", hoursPerWeek: null },
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
	sprint3: { from: "2026-10-15", to: "2026-10-21", weeks: 3 },
	/** Day 15's advice reads the run so far. */
	midway: { from: "2026-10-01", to: "2026-10-14", weeks: 2 },
	/** Day 29, the final review and the report: the whole run. */
	end: { from: "2026-10-01", to: "2026-10-28", weeks: 4 },
} as const;

export type Moment = keyof typeof MOMENTS;

/** What happened in the moment's period, as `projectPicture` writes it. */
const pictureAt = (
	a: Artifacts,
	moment: Moment,
	without: (keyof Artifacts)[] = [],
) => {
	const { from, to } = MOMENTS[moment];
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
	return happened.length
		? `What happened on the project ${period}:\n${happened.join("\n")}`
		: `Nothing else happened on the project ${period}.`;
};

/** The team as `curatorTeam` builds it at a moment: the weeks already behind only. */
const teamAt = (moment: Moment) => ({
	members: MEMBERS.length,
	stated: 2,
	hoursPerWeek: { from: 30, to: 40 },
	hoursPerRun: { from: 120, to: 160 },
	people: MEMBERS.map((member) => ({
		...member,
		weeks: PULSE[member.name].slice(0, MOMENTS[moment].weeks),
		joinedOn: null as string | null,
	})),
	openings: [] as { role: string; postedOn: string; applied: number }[],
});

/** The public devlogs of the moment's period with their applause and views, as `curatorMarketing` reads them. */
const DEVLOGS = [
	{
		title: "Devlog #4: The first island floods",
		publishedAt: "2026-10-05",
		applause: 6,
		views: 58,
	},
	{
		title: "Devlog #5: Outrunning the tide",
		publishedAt: "2026-10-12",
		applause: 3,
		views: 31,
	},
	{
		title: "Devlog #6: Five strangers played it",
		publishedAt: "2026-10-20",
		applause: 9,
		views: 102,
	},
];

const marketingAt = (moment: Moment) => {
	const { from, to } = MOMENTS[moment];
	return {
		devlogs: DEVLOGS.filter(
			(post) => post.publishedAt >= from && post.publishedAt <= to,
		).reverse(),
		links: ["itch.io: https://hollowtide.itch.io/hollow-tide"],
	};
};

export const hollowTide = (language: LabLanguage) => {
	const text = TEXT[language];
	return {
		...text,
		workflow: workflowAt,
		team: teamAt,
		marketing: marketingAt,
		picture: (moment: Moment, without?: (keyof Artifacts)[]) =>
			pictureAt(text.artifacts, moment, without),
	};
};
