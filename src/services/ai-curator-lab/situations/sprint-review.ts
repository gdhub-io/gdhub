import {
	type LabLanguage,
	type Situation,
	say,
	type sprintReviewInput,
} from "../schemas";
import { hollowTide, pulseOf } from "./hollow-tide";

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
		focusAfter3: ["Run the playtest with five players and write the notes up"],
		verdict:
			"All three tasks are delivered and the stage's devlog is out: ready for Preparing a demo version.",
	},
	ru: {
		demoSeen: "Страница на itch.io с играбельной веб-сборкой острова.",
		boardSeen: "Доска с палитрой и двумя листами персонажей.",
		notesSeen: "Заметки по пяти игрокам, у каждого — на чём застрял.",
		focusAfter1: ["Начать доску стиля", "Назначить плейтест"],
		focusAfter3: ["Провести плейтест на пять игроков и записать заметки"],
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

	// Day 8: sprint 1 landed the greybox and its demo build.
	const sprint1 = {
		goal: project.goal,
		workflow: project.workflow("sprint1"),
		sprint: 1,
		tasks: [demoDone, open(board), open(playtest)],
		devlogs: [devlogs.greybox],
		media: [],
		artifacts: [{ type: "ExecutableBuild", name: artifacts.demo }],
		pulse: pulseOf(1),
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
				pulse: pulseOf(2),
				focusLastReview: t.focusAfter1,
				workflow: project.workflow("sprint2"),
				picture: project.picture("sprint2"),
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
				pulse: pulseOf(4),
				focusLastReview: t.focusAfter3,
				verdict: { verdict: "StageClosed", note: t.verdict },
				workflow: project.workflow("end"),
				picture: project.picture("end"),
			},
		},
	];
};
