import type { Situation, sprintReviewInput } from "../schemas";
import { DEVLOGS, GOAL, OUTCOMES, PICTURE, STAGE } from "./hollow-tide";

/** Public, long-lived media, read live on Run like a devlog's own links. */
const SCREENSHOT =
	"https://raw.githubusercontent.com/godotengine/godot-demo-projects/master/2d/platformer/screenshots/platformer.webp";
const LANDSCAPE =
	"https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Fronalpstock_big.jpg/960px-Fronalpstock_big.jpg";
const VIDEO = "https://www.youtube.com/watch?v=aqz-KE-bpKQ";

const tasks = [
	{
		...OUTCOMES.demo,
		done: { type: "ExecutableBuild", name: "Island demo 0.1" },
		cut: false,
		firstWording: null,
		seen: null,
	},
	{ ...OUTCOMES.board, done: null, cut: false, firstWording: null, seen: null },
	{
		...OUTCOMES.playtest,
		done: null,
		cut: false,
		firstWording: null,
		seen: null,
	},
];

const base = {
	goal: GOAL,
	stage: STAGE.name,
	sprint: 1,
	tasks,
	devlogs: [DEVLOGS.greybox],
	media: [SCREENSHOT],
	artifacts: [{ type: "ExecutableBuild", name: "Island demo 0.1" }],
	pulse: { worked: 3, missing: 0 },
	focusLastReview: [],
	verdict: null,
	picture: PICTURE,
};

export const sprintReviewSituations: Situation<typeof sprintReviewInput>[] = [
	{ id: "good-week", label: "A good first sprint, a screenshot", input: base },
	{
		id: "media-off-topic",
		label: "The devlog's picture is not the game",
		input: { ...base, media: [LANDSCAPE] },
	},
	{
		id: "video",
		label: "A devlog with a video",
		input: { ...base, media: [SCREENSHOT, VIDEO] },
	},
	{
		id: "quiet",
		label: "No devlog, one member missing",
		input: {
			...base,
			sprint: 2,
			devlogs: [],
			media: [],
			artifacts: [],
			pulse: { worked: 2, missing: 1 },
			focusLastReview: ["Start the art style board", "Book the playtest"],
		},
	},
	{
		id: "final",
		label: "The final review, verdict settled",
		input: {
			...base,
			sprint: 4,
			devlogs: [DEVLOGS.styleBoard, DEVLOGS.playtest],
			media: [],
			artifacts: [{ type: "Document", name: "Playtest notes" }],
			verdict: {
				verdict: "GoalMet",
				note: "The demo and the playtest notes are there; the style board was taken on trust.",
			},
		},
	},
];
