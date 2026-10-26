import {
	type LabLanguage,
	type Situation,
	say,
	type sprintReviewInput,
} from "../schemas";
import { hollowTide } from "./hollow-tide";

/** Public, long-lived media, read live on Run like a devlog's own links. */
const SCREENSHOT =
	"https://raw.githubusercontent.com/godotengine/godot-demo-projects/master/2d/platformer/screenshots/platformer.webp";
const LANDSCAPE =
	"https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Fronalpstock_big.jpg/960px-Fronalpstock_big.jpg";
const VIDEO = "https://www.youtube.com/watch?v=aqz-KE-bpKQ";

const TEXT = {
	en: {
		demo: "Island demo 0.1",
		notes: "Playtest notes",
		focus: ["Start the art style board", "Book the playtest"],
		verdict:
			"The demo and the playtest notes are there; the style board was taken on trust.",
	},
	ru: {
		demo: "Демо острова 0.1",
		notes: "Заметки плейтеста",
		focus: ["Начать доску стиля", "Назначить плейтест"],
		verdict: "Демо и заметки плейтеста есть; доска стиля засчитана на доверии.",
	},
};

const TEAM = ["Game designer", "Artist", "Programmer"];

export const sprintReviewSituations = (
	language: LabLanguage,
): Situation<typeof sprintReviewInput>[] => {
	const t = TEXT[language];
	const project = hollowTide(language);
	const { demo, board, playtest } = project.outcomes;
	const task = (each: { id: string; text: string }) => ({
		...each,
		done: null,
		cut: false,
		firstWording: null,
		seen: null,
	});
	const base = {
		goal: project.goal,
		stage: project.workflow.currentStage,
		sprint: 1,
		tasks: [
			{ ...task(demo), done: { type: "ExecutableBuild", name: t.demo } },
			task(board),
			task(playtest),
		],
		devlogs: [project.devlogs.greybox],
		media: [SCREENSHOT],
		artifacts: [{ type: "ExecutableBuild", name: t.demo }],
		pulse: { worked: TEAM, missing: [] },
		focusLastReview: [],
		verdict: null,
		picture: project.picture,
	};

	return [
		{
			id: "good-week",
			label: say(
				language,
				"A good first sprint, a screenshot",
				"Хороший первый спринт, скриншот",
			),
			input: base,
		},
		{
			id: "media-off-topic",
			label: say(
				language,
				"The devlog's picture is not the game",
				"Картинка в девлоге — не игра",
			),
			input: { ...base, media: [LANDSCAPE] },
		},
		{
			id: "video",
			label: say(language, "A devlog with a video", "Девлог с видео"),
			input: { ...base, media: [SCREENSHOT, VIDEO] },
		},
		{
			id: "quiet",
			label: say(
				language,
				"No devlog, the artist missing",
				"Нет девлога, художник выпал",
			),
			input: {
				...base,
				sprint: 2,
				devlogs: [],
				media: [],
				artifacts: [],
				pulse: { worked: ["Game designer", "Programmer"], missing: ["Artist"] },
				focusLastReview: t.focus,
			},
		},
		{
			id: "final",
			label: say(
				language,
				"The final review, verdict settled",
				"Итоговый разбор, вердикт уже вынесен",
			),
			input: {
				...base,
				sprint: 4,
				devlogs: [project.devlogs.styleBoard, project.devlogs.playtest],
				media: [],
				artifacts: [{ type: "Document", name: t.notes }],
				verdict: { verdict: "GoalMet", note: t.verdict },
				picture: project.pictureAtEnd,
			},
		},
	];
};
