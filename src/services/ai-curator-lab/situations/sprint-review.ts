import {
	type LabLanguage,
	type Situation,
	say,
	type sprintReviewInput,
} from "../schemas";
import { hollowTide } from "./hollow-tide";

/**
 * Public, long-lived media, read live on Run like a devlog's own links. Hollow
 * Tide has no real screenshots, so both are media that are not the game.
 */
const LANDSCAPE =
	"https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Fronalpstock_big.jpg/960px-Fronalpstock_big.jpg";
const VIDEO = "https://www.youtube.com/watch?v=aqz-KE-bpKQ";

const TEXT = {
	en: {
		demoSeen: "An itch.io page with a playable web build of the island.",
		boardSeen: "A board with a palette and two character sheets.",
		notesSeen: "Notes from five players, each with what they hit.",
		focusAfter1: ["Start the art style board", "Book the playtest"],
		focusAfter2: [
			"Keep the style board to one page",
			"Book the playtest with five players",
		],
		focusAfter3: ["Run the playtest with five players and write the notes up"],
		diceSeen:
			"A photo of colourful dice on a table; no palette or character sheets.",
		paletteSeen: "A palette of six colours; no character sheets yet.",
		trailer: "Teaser trailer",
		trailerDevlog:
			"Week 1: we cut a 30-second teaser from the concept art and posted it on X. The greybox is not started yet.",
		boardDevlog:
			"Week 2: the style board is on the task. The palette is settled; the hero sheets come next week.",
		mobileDevlog:
			"Week 2: instead of the playtest we made the island demo run on phones — most of our testers will play it there. Touch controls are in.",
		mobileBuild: "Island demo 0.2 · mobile web",
		noArtistDevlog:
			"Week 2: Tom, our only artist, left the team for another job. Nobody draws now, so the style board did not move. Marta and Ivo kept polishing the island.",
		newArtistDevlog:
			"Week 2: Lena joined us as a 2D artist on Friday and started the hero sheets; the palette is on the board.",
		artistRole: "2D artist",
		verdict:
			"All three tasks are delivered and the stage's devlog is out: ready for Preparing a demo version.",
	},
	ru: {
		demoSeen: "Страница на itch.io с играбельной веб-сборкой острова.",
		boardSeen: "Доска с палитрой и двумя листами персонажей.",
		notesSeen: "Заметки по пяти игрокам, у каждого — на чём застрял.",
		focusAfter1: ["Начать доску стиля", "Назначить плейтест"],
		focusAfter2: [
			"Свести доску стиля к одной странице",
			"Назначить плейтест на пять игроков",
		],
		focusAfter3: ["Провести плейтест на пять игроков и записать заметки"],
		diceSeen:
			"Фото разноцветных кубиков на столе; ни палитры, ни листов персонажей.",
		paletteSeen: "Палитра из шести цветов; листов персонажей пока нет.",
		trailer: "Тизер-трейлер",
		trailerDevlog:
			"Неделя 1: смонтировали 30-секундный тизер из концепт-арта и выложили в X. Блокаут ещё не начат.",
		boardDevlog:
			"Неделя 2: доска стиля в задаче. Палитра готова, листы героев — на следующей неделе.",
		mobileDevlog:
			"Неделя 2: вместо плейтеста сделали так, чтобы демо острова шло на телефонах — большинство тестеров будут играть там. Сенсорное управление готово.",
		mobileBuild: "Демо острова 0.2 · мобильный веб",
		noArtistDevlog:
			"Неделя 2: Том, наш единственный художник, ушёл на другую работу. Рисовать больше некому, доска стиля не сдвинулась. Марта и Иво доводили остров.",
		newArtistDevlog:
			"Неделя 2: в пятницу к нам пришла Лена, 2D-художник, и начала листы героев; палитра на доске.",
		artistRole: "2D-художник",
		verdict:
			"Все три задачи сданы, девлог стадии опубликован: можно переходить к Preparing a demo version.",
	},
};

export const sprintReviewSituations = (
	language: LabLanguage,
): Situation<typeof sprintReviewInput>[] => {
	const t = TEXT[language];
	const project = hollowTide(language);
	const { artifacts, devlogs } = project;
	const { demo, board, playtest } = project.outcomes;
	const open = (each: { id: string; text: string }) => ({
		...each,
		done: null,
		cut: false,
		firstWording: null,
		seen: null,
	});
	const done = (
		each: { id: string; text: string },
		type: string,
		name: string,
		note: string,
	) => ({
		...open(each),
		done: { type, name },
		seen: { match: "Matches" as const, note },
	});
	const demoDone = done(demo, "ExecutableBuild", artifacts.demo, t.demoSeen);
	/** Day 15 without the artist: Tom left in sprint 2, nobody on the team draws, and the board never moved. */
	const shortOfArt = (
		openings: { role: string; postedOn: string; applied: number }[],
	) => {
		const team = project.team("sprint2");
		return {
			goal: project.goal,
			workflow: project.workflow("sprint2"),
			sprint: 2,
			tasks: [demoDone, open(board), open(playtest)],
			devlogs: [t.noArtistDevlog],
			media: [],
			artifacts: [],
			team: {
				...team,
				members: team.members - 1,
				stated: team.stated - 1,
				people: team.people.filter((person) => person.name !== "Tom"),
				openings,
			},
			focusLastReview: t.focusAfter1,
			verdict: null,
			picture: project.picture("sprint2"),
		};
	};
	const boardWith = (match: "Partly" | "DoesNotMatch", note: string) => ({
		...done(board, "Image", artifacts.board, note),
		seen: { match, note },
	});

	// Day 8: sprint 1 landed the greybox and its demo build.
	const sprint1 = {
		goal: project.goal,
		workflow: project.workflow("sprint1"),
		sprint: 1,
		tasks: [demoDone, open(board), open(playtest)],
		devlogs: [devlogs.greybox],
		media: [],
		artifacts: [{ type: "ExecutableBuild", name: artifacts.demo }],
		team: project.team("sprint1"),
		focusLastReview: [],
		verdict: null,
		picture: project.picture("sprint1"),
	};

	return [
		{
			id: "good-week",
			label: say(language, "A good first sprint", "Хороший первый спринт"),
			input: sprint1,
		},
		{
			id: "media-off-topic",
			label: say(
				language,
				"The devlog's picture is not the game",
				"Картинка в девлоге — не игра",
			),
			input: { ...sprint1, media: [LANDSCAPE] },
		},
		{
			id: "video",
			label: say(
				language,
				"The devlog's video is not the game",
				"Видео в девлоге — не игра",
			),
			input: { ...sprint1, media: [VIDEO] },
		},
		{
			// Day 15: sprint 2 showed nothing, and the artist did not confirm it.
			id: "quiet",
			label: say(
				language,
				"No devlog, the artist missing",
				"Нет девлога, художник выпал",
			),
			input: {
				...sprint1,
				sprint: 2,
				devlogs: [],
				artifacts: [],
				team: project.team("sprint2"),
				focusLastReview: t.focusAfter1,
				workflow: project.workflow("sprint2"),
				picture: project.picture("sprint2"),
			},
		},
		{
			// Day 8: the sprint went into a trailer no task asked for.
			id: "outside-plan",
			label: say(
				language,
				"Work outside the plan, the tasks untouched",
				"Работа вне плана, задачи не тронуты",
			),
			input: {
				...sprint1,
				tasks: [open(demo), open(board), open(playtest)],
				devlogs: [t.trailerDevlog],
				artifacts: [{ type: "Video", name: t.trailer }],
			},
		},
		{
			// Day 15: the last focus asked for the playtest; the team made the demo
			// run on phones instead — another route that still serves the goal.
			id: "own-route",
			label: say(
				language,
				"Day 15, the team went its own way toward the goal",
				"День 15, команда пошла своим путём к цели",
			),
			input: {
				...sprint1,
				sprint: 2,
				tasks: [demoDone, open(board), open(playtest)],
				devlogs: [t.mobileDevlog],
				artifacts: [{ type: "ExecutableBuild", name: t.mobileBuild }],
				team: project.team("sprint2"),
				focusLastReview: t.focusAfter1,
				workflow: project.workflow("sprint2"),
				picture: project.picture("sprint2"),
			},
		},
		{
			// Day 15: the only artist dropped out and the art task stalled; nobody is being sought.
			id: "short-artist",
			label: say(
				language,
				"Day 15, no artist and no open position",
				"День 15, художника нет и вакансии нет",
			),
			input: shortOfArt([]),
		},
		{
			// The same, with a position for an artist already open.
			id: "short-artist-open",
			label: say(
				language,
				"Day 15, no artist, a position already open",
				"День 15, художника нет, вакансия уже открыта",
			),
			input: shortOfArt([
				{ role: t.artistRole, postedOn: "2026-10-09", applied: 2 },
			]),
		},
		{
			// A 2D artist joined mid-sprint and the board moved.
			id: "new-member",
			label: say(
				language,
				"Day 15, a new artist joined mid-sprint",
				"День 15, в середине спринта пришёл художник",
			),
			input: {
				...sprint1,
				sprint: 2,
				tasks: [demoDone, boardWith("Partly", t.paletteSeen), open(playtest)],
				devlogs: [t.newArtistDevlog],
				artifacts: [{ type: "Image", name: artifacts.board }],
				team: {
					...project.team("sprint2"),
					members: 4,
					people: [
						...project.team("sprint2").people,
						{
							name: "Lena",
							role: t.artistRole,
							level: "Middle",
							hoursPerWeek: { from: 15, to: 20 },
							weeks: [false, true],
							joinedOn: "2026-10-10",
						},
					],
				},
				focusLastReview: t.focusAfter1,
				workflow: project.workflow("sprint2"),
				picture: project.picture("sprint2"),
			},
		},
		{
			// Day 15: the style board is ticked, but its image is not a style board.
			id: "mismatch",
			label: say(
				language,
				"Day 15, the evidence does not match its task",
				"День 15, доказательство не совпадает с задачей",
			),
			input: {
				...sprint1,
				sprint: 2,
				tasks: [
					demoDone,
					boardWith("DoesNotMatch", t.diceSeen),
					open(playtest),
				],
				devlogs: [t.boardDevlog],
				artifacts: [{ type: "Image", name: artifacts.board }],
				team: project.team("sprint2"),
				focusLastReview: t.focusAfter1,
				workflow: project.workflow("sprint2"),
				picture: project.picture("sprint2"),
			},
		},
		{
			// Day 15: half done and a big playtest ahead — where the advice and the focus used to disagree.
			id: "midway-half",
			label: say(
				language,
				"Day 15, half done, a big playtest ahead",
				"День 15, половина сделана, впереди большой плейтест",
			),
			input: {
				...sprint1,
				sprint: 2,
				tasks: [demoDone, boardWith("Partly", t.paletteSeen), open(playtest)],
				devlogs: [t.boardDevlog],
				artifacts: [{ type: "Image", name: artifacts.board }],
				team: project.team("sprint2"),
				focusLastReview: t.focusAfter1,
				workflow: project.workflow("sprint2"),
				picture: project.picture("sprint2"),
			},
		},
		{
			// Day 22: back on course after the quiet sprint 2 — the style board is in.
			id: "on-course",
			label: say(language, "Day 22, back on course", "День 22, снова на курсе"),
			input: {
				...sprint1,
				sprint: 3,
				tasks: [
					demoDone,
					done(board, "Image", artifacts.board, t.boardSeen),
					open(playtest),
				],
				devlogs: [devlogs.styleBoard],
				artifacts: [{ type: "Image", name: artifacts.board }],
				team: project.team("sprint3"),
				focusLastReview: t.focusAfter2,
				workflow: project.workflow("sprint3"),
				picture: project.picture("sprint3"),
			},
		},
		{
			// Day 29: sprint 4 brought the playtest; the verdict is settled.
			id: "final",
			label: say(
				language,
				"The final review, verdict settled",
				"Итоговый разбор, вердикт уже вынесен",
			),
			input: {
				...sprint1,
				sprint: 4,
				tasks: [
					demoDone,
					done(board, "Image", artifacts.board, t.boardSeen),
					done(playtest, "Document", artifacts.notes, t.notesSeen),
				],
				devlogs: [devlogs.playtest],
				artifacts: [{ type: "Document", name: artifacts.notes }],
				team: project.team("end"),
				focusLastReview: t.focusAfter3,
				verdict: { verdict: "StageClosed", note: t.verdict },
				workflow: project.workflow("end"),
				picture: project.picture("end"),
			},
		},
	];
};
