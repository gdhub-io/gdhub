import type { Direction } from "@/config/checkpoint";
import type { CheckpointVerdict } from "@/config/prisma-enums";

/**
 * E2E Test Game's road (GDHUB-140): nine checkpoints from the idea to the
 * release on Steam. What the team did is written here once; everything a call
 * reads — the team, the activity, the pictures, the evidence — is derived from
 * it in `e2e-test-game.ts`, so every situation and test tells the same story.
 *
 * `direction` and `verdict` are what the curator should read: the road is
 * known, so an answer can be checked against it.
 */

type Hours = { from: number; to: number };

export type RoadMember = {
	id: string;
	name: string;
	role: string;
	level: string;
	hours: Hours;
};

type Seen = {
	match: "Matches" | "Partly" | "DoesNotMatch";
	note: string;
};

export type RoadArtifact = {
	id: string;
	type: string;
	name: string;
	link: string;
	/** Who added it, as the activity feed names them. */
	by: string;
	on: string;
	/** The task it is attached to, and what the evidence check saw in it. */
	proves?: { task: string; seen: Seen };
};

type RoadDevlog = {
	id: string;
	on: string;
	title: string;
	text: string;
	views: number;
	applause: number;
};

export type TeamChange =
	| { on: string; joins: RoadMember }
	| { on: string; leaves: string }
	| { on: string; hours: string; to: Hours }
	| { on: string; opens: { id: string; title: string }; applied: number }
	| { on: string; vacancy: string; applicants: number }
	| { on: string; closes: string };

type RoadSprint = {
	direction: Direction;
	devlogs: RoadDevlog[];
	artifacts: RoadArtifact[];
	team?: TeamChange[];
	/** Members who did not confirm the week. */
	missed?: string[];
	/** Project page fields and links set in the sprint. */
	project?: Partial<RoadProject>;
	links?: Record<string, string>;
};

export type RoadProject = {
	description: string | null;
	genre: string | null;
	platform: string | null;
	setting: string | null;
	visualStyle: string | null;
};

export type RoadCheckpoint = {
	number: number;
	stage: string;
	nextStage: string;
	/** Day 1; the checkpoint runs 28 days. */
	start: string;
	goal: string;
	inputs: { id: string; text: string }[];
	tasks: { id: string; text: string }[];
	/** The stage's required tasks, and the day each was done. */
	required: { name: string; doneOn: string | null }[];
	sprints: [RoadSprint, RoadSprint, RoadSprint, RoadSprint];
	verdict: CheckpointVerdict;
	/** What the verdict note should name, to read the answer against. */
	because: string;
};

const ANA: RoadMember = {
	id: "tm_ana",
	name: "Ana Sousa",
	role: "Programmer",
	level: "Middle",
	hours: { from: 15, to: 20 },
};
export const BO: RoadMember = {
	id: "tm_bo",
	name: "Bo Lindqvist",
	role: "2D artist",
	level: "Junior",
	hours: { from: 10, to: 15 },
};
const CLEO: RoadMember = {
	id: "tm_cleo",
	name: "Cleo Martin",
	role: "Sound designer",
	level: "Junior",
	hours: { from: 5, to: 10 },
};
export const DAN: RoadMember = {
	id: "tm_dan",
	name: "Dan Okafor",
	role: "Level designer",
	level: "Middle",
	hours: { from: 10, to: 15 },
};

/** Who is on the team before the first checkpoint. */
export const FOUNDERS = [ANA, BO];

export const E2E_PROJECT = {
	name: "E2E Test Game",
	pitch:
		"A gnome saves Christmas: collect candies, stomp the villain's minions and get the Snow Maiden back. A classic 2D platformer.",
	genre: "Platformer",
	projectGoal: "The game is released and people play it.",
	author: {
		speciality: "Programmer",
		level: "Middle",
		experience: "Two jam games, one shipped mobile puzzle.",
	},
};

export const LINKS = {
	itch: "https://e2e-test-game.itch.io/game",
	jump: "https://e2e-test-game.itch.io/jump-test",
	demo: "https://e2e-test-game.itch.io/demo",
	steam: "https://store.steampowered.com/app/3000000/E2E_Test_Game",
	docs: "https://docs.example/e2e-test-game",
	board: "https://www.figma.com/board/e2e-test-game",
	trailer: "https://www.youtube.com/watch?v=e2e-test-game",
};

const doc = (path: string) => `${LINKS.docs}/${path}`;

const PITCH_SHORT = "A gnome saves Christmas. A classic 2D platformer.";

export const E2E_ROAD: RoadCheckpoint[] = [
	{
		number: 1,
		stage: "Ideation",
		nextStage: "Concepting",
		start: "2026-08-03",
		goal: "One idea chosen and written up: a one-page description of the game, and why it beat the other two.",
		inputs: [
			{
				id: "c1-i1",
				text: "Three game ideas in a notes file: a gnome platformer, a cozy fishing game, a tower defence",
			},
		],
		tasks: [
			{
				id: "c1-t1",
				text: "The three ideas compared: what each is, who plays it, games like it",
			},
			{
				id: "c1-t2",
				text: "Ten games like the chosen one played and noted",
			},
			{ id: "c1-t3", text: "A one-page description of the chosen game" },
		],
		required: [{ name: "Fill in the project settings", doneOn: "2026-08-27" }],
		sprints: [
			{
				direction: "toward",
				devlogs: [
					{
						id: "d1",
						on: "2026-08-07",
						title: "Devlog #1: Three ideas, one winner",
						text: "Week 1: we wrote down our three ideas — a gnome platformer, a cozy fishing game and a tower defence — and compared them: who plays them, what they are like, what two people can build. The platformer wins: Ana has written jump physics before and Bo draws pixel art.",
						views: 12,
						applause: 1,
					},
				],
				artifacts: [
					{
						id: "a1",
						type: "Document",
						name: "Three ideas compared",
						link: doc("ideas"),
						by: ANA.name,
						on: "2026-08-07",
						proves: {
							task: "c1-t1",
							seen: {
								match: "Matches",
								note: "A table of the three ideas with their players and similar games; the platformer is chosen, with why.",
							},
						},
					},
				],
			},
			{
				direction: "toward",
				devlogs: [
					{
						id: "d2",
						on: "2026-08-14",
						title: "Devlog #2: Ten platformers in a week",
						text: "Week 2: we played ten platformers and wrote down what to take from each — the coyote time of one, the candy trail of another, the short levels of a third. The notes are on the task.",
						views: 18,
						applause: 2,
					},
				],
				artifacts: [
					{
						id: "a2",
						type: "Document",
						name: "Ten platformers, noted",
						link: doc("references"),
						by: BO.name,
						on: "2026-08-14",
						proves: {
							task: "c1-t2",
							seen: {
								match: "Matches",
								note: "Ten platformers, each with what to take from it.",
							},
						},
					},
				],
			},
			{
				direction: "sideways",
				devlogs: [
					{
						id: "d3",
						on: "2026-08-21",
						title: "Devlog #3: Who took the Snow Maiden",
						text: "Week 3: we got carried away with the lore — who the villain is, why he took the Snow Maiden, the gnome's village and its history. Six pages. The one-pager is not started.",
						views: 25,
						applause: 4,
					},
				],
				artifacts: [
					{
						id: "a3",
						type: "Document",
						name: "The lore of the winter town",
						link: doc("lore"),
						by: BO.name,
						on: "2026-08-21",
					},
				],
			},
			{
				direction: "toward",
				devlogs: [
					{
						id: "d4",
						on: "2026-08-28",
						title: "Devlog #4: The game on one page",
						text: "Week 4: the one-pager is done. A gnome saves Christmas: a classic 2D platformer — run, jump, stomp, collect candies, reach the flag — for players who grew up on the genre. The lore is one paragraph in it. The project settings are filled in.",
						views: 31,
						applause: 5,
					},
				],
				artifacts: [
					{
						id: "a4",
						type: "Document",
						name: "One-page description",
						link: doc("one-pager"),
						by: ANA.name,
						on: "2026-08-27",
						proves: {
							task: "c1-t3",
							seen: {
								match: "Matches",
								note: "One page: the game, its players and why this idea; the lore kept to a paragraph.",
							},
						},
					},
				],
				project: {
					description: PITCH_SHORT,
					genre: "Platformer",
					platform: "Web",
					setting: "Winter",
					visualStyle: "Pixel art",
				},
			},
		],
		verdict: "StageClosed",
		because:
			"Every task shown, the idea chosen and defended; sprint 3 went into lore, and sprint 4 came back to the one-pager.",
	},
	{
		number: 2,
		stage: "Concepting",
		nextStage: "Prototyping",
		start: "2026-08-31",
		goal: "A concept the team can build from: the core loop and controls, the first version's scope, the look, and the riskiest questions named.",
		inputs: [
			{ id: "c2-i1", text: "The one-page description" },
			{ id: "c2-i2", text: "Ten platformers, noted" },
		],
		tasks: [
			{
				id: "c2-t1",
				text: "A concept document: core loop, controls, enemies and the first version's scope",
			},
			{ id: "c2-t2", text: "A mood board of the winter town and the gnome" },
			{
				id: "c2-t3",
				text: "The three riskiest questions, each with how Prototyping answers it",
			},
		],
		required: [],
		sprints: [
			{
				direction: "toward",
				devlogs: [
					{
						id: "d5",
						on: "2026-09-04",
						title: "Devlog #5: Run, jump, stomp",
						text: "Week 1: the core loop is on paper — run, jump, stomp, collect candies, reach the flag — and the controls: move and jump, nothing else. Two enemies: a snowman that walks and a crow that dives. Bo made the first mood board. We opened a position for a sound designer.",
						views: 34,
						applause: 4,
					},
				],
				artifacts: [
					{
						id: "a5",
						type: "Document",
						name: "Concept document, draft",
						link: doc("concept"),
						by: ANA.name,
						on: "2026-09-04",
					},
					{
						id: "a6",
						type: "Image",
						name: "Mood board v1",
						link: `${LINKS.board}/v1`,
						by: BO.name,
						on: "2026-09-05",
					},
				],
				team: [
					{
						on: "2026-09-02",
						opens: { id: "v1", title: "Sound designer" },
						applied: 1,
					},
				],
			},
			{
				direction: "stalled",
				devlogs: [
					{
						id: "d6",
						on: "2026-09-11",
						title: "Devlog #6: Warmer colours",
						text: "Week 2: Bo reworked the mood board — the same winter town, warmer colours. Cleo joined us as a sound designer and listened through our references. The concept document did not move.",
						views: 22,
						applause: 2,
					},
				],
				artifacts: [
					{
						id: "a7",
						type: "Image",
						name: "Mood board v2",
						link: `${LINKS.board}/v2`,
						by: BO.name,
						on: "2026-09-11",
						proves: {
							task: "c2-t2",
							seen: {
								match: "Partly",
								note: "The winter town in warmer colours; the gnome is not on the board.",
							},
						},
					},
				],
				team: [
					{ on: "2026-09-09", joins: CLEO },
					{ on: "2026-09-09", closes: "v1" },
				],
			},
			{
				direction: "toward",
				devlogs: [
					{
						id: "d7",
						on: "2026-09-18",
						title: "Devlog #7: The first version is three levels",
						text: "Week 3: the concept document is finished. The first version is three levels and a boss, the camera follows the gnome, candies open a bonus room. Bo put the gnome on the mood board: red hat, white beard, a candy-cane staff.",
						views: 40,
						applause: 6,
					},
				],
				artifacts: [
					{
						id: "a8",
						type: "Document",
						name: "Concept document 1.0",
						link: doc("concept-1"),
						by: ANA.name,
						on: "2026-09-18",
						proves: {
							task: "c2-t1",
							seen: {
								match: "Matches",
								note: "Core loop, controls, two enemies and a three-level first version.",
							},
						},
					},
					{
						id: "a9",
						type: "Image",
						name: "Mood board v3",
						link: `${LINKS.board}/v3`,
						by: BO.name,
						on: "2026-09-17",
						proves: {
							task: "c2-t2",
							seen: {
								match: "Matches",
								note: "The winter town and the gnome in his red hat, in pixel art.",
							},
						},
					},
				],
			},
			{
				direction: "toward",
				devlogs: [
					{
						id: "d8",
						on: "2026-09-25",
						title: "Devlog #8: What could sink us",
						text: "Week 4: we named the three riskiest questions. Does the jump feel good — a jump test answers it. Can we build a level fast enough — level 1 to the flag answers it. Will strangers finish it — five players outside the team answer it. All three go into Prototyping.",
						views: 44,
						applause: 7,
					},
				],
				artifacts: [
					{
						id: "a10",
						type: "Document",
						name: "Riskiest questions",
						link: doc("risks"),
						by: ANA.name,
						on: "2026-09-25",
						proves: {
							task: "c2-t3",
							seen: {
								match: "Matches",
								note: "Three questions, each with the build that answers it.",
							},
						},
					},
				],
			},
		],
		verdict: "StageClosed",
		because:
			"The concept is settled and its risks named; sprint 2 only recoloured the mood board while the concept stood still.",
	},
	{
		number: 3,
		stage: "Prototyping",
		nextStage: "Preparing a demo version",
		start: "2026-11-02",
		goal: "A playable jump and the first level anyone can open.",
		inputs: [
			{
				id: "c3-i1",
				text: "A concept page and a mood board of the winter town",
			},
		],
		tasks: [
			{ id: "t1", text: "Jump with coyote time and a jump buffer" },
			{ id: "t2", text: "Level 1, from the start to the flag" },
			{ id: "t3", text: "A web build anyone can open on itch.io" },
			{ id: "t4", text: "Five players outside the team reach the flag" },
		],
		required: [
			{ name: "Publish a devlog about the prototype", doneOn: "2026-11-07" },
		],
		sprints: [
			{
				direction: "toward",
				devlogs: [
					{
						id: "d9",
						on: "2026-11-07",
						title: "Devlog #9: The gnome jumps",
						text: "Week 1: the gnome runs and jumps. Coyote time is 0.1 s and the jump buffer 0.12 s, so a late press still jumps. The web build is on itch.io.",
						views: 48,
						applause: 6,
					},
				],
				artifacts: [
					{
						id: "a11",
						type: "ExecutableBuild",
						name: "Jump test 0.1 · web",
						link: LINKS.jump,
						by: ANA.name,
						on: "2026-11-07",
						proves: {
							task: "t1",
							seen: {
								match: "Matches",
								note: "The gnome jumps in the browser, and a press just after the edge still jumps.",
							},
						},
					},
				],
			},
			{
				direction: "sideways",
				devlogs: [
					{
						id: "d10",
						on: "2026-11-13",
						title: "Devlog #10: A title screen",
						text: "Week 2: we made the title screen — the gnome on a candy-cane sign, snow falling — and the logo. Bo can give fewer hours for the rest of the month, so we are looking for a level designer.",
						views: 45,
						applause: 3,
					},
				],
				artifacts: [
					{
						id: "a12",
						type: "Image",
						name: "Title screen and logo",
						link: doc("title-screen.png"),
						by: BO.name,
						on: "2026-11-13",
					},
				],
				team: [
					{ on: "2026-11-11", hours: BO.id, to: { from: 5, to: 10 } },
					{
						on: "2026-11-12",
						opens: { id: "v2", title: "Level designer" },
						applied: 2,
					},
				],
				project: {
					description:
						"A gnome saves Christmas: collect candies, stomp the villain's minions and get the Snow Maiden back. A classic 2D platformer.",
				},
			},
			{
				direction: "idle",
				devlogs: [],
				artifacts: [],
				missed: [ANA.id, BO.id, CLEO.id],
			},
			{
				direction: "toward",
				devlogs: [
					{
						id: "d11",
						on: "2026-11-27",
						title: "Devlog #11: Level 1, start to flag",
						text: "Week 4: level 1 is done, from the snowy start to the flag, with candies to collect, two kinds of enemies to stomp and the villain's sleigh flying off with the Snow Maiden at the end. It is on itch.io.",
						views: 70,
						applause: 9,
					},
					{
						id: "d12",
						on: "2026-11-28",
						title: "Devlog #12: Two friends played it",
						text: "Week 4: two friends played level 1. Both reached the flag; one fell into the second pit four times.",
						views: 52,
						applause: 4,
					},
				],
				artifacts: [
					{
						id: "a13",
						type: "ExecutableBuild",
						name: "E2E Test Game 0.3 · web",
						link: LINKS.itch,
						by: ANA.name,
						on: "2026-11-27",
						proves: {
							task: "t2",
							seen: {
								match: "Matches",
								note: "Level 1 plays from the start to the flag in the browser.",
							},
						},
					},
					{
						id: "a14",
						type: "Document",
						name: "Playtest notes",
						link: doc("playtest"),
						by: ANA.name,
						on: "2026-11-28",
						proves: {
							task: "t4",
							seen: {
								match: "DoesNotMatch",
								note: "Notes from two players, both friends of the team, not five from outside it.",
							},
						},
					},
				],
				team: [{ on: "2026-11-29", vacancy: "v2", applicants: 3 }],
				links: { itch: LINKS.itch },
			},
		],
		verdict: "GoalMissed",
		because:
			"The jump and level 1 are shown, but the playtest had two friends, not five strangers; sprint 2 went into a title screen and sprint 3 had nothing.",
	},
	{
		number: 4,
		stage: "Prototyping",
		nextStage: "Preparing a demo version",
		start: "2026-12-07",
		goal: "Five players outside the team finish level 1, and level 2 is greyboxed from what they hit.",
		inputs: [
			{ id: "c4-i1", text: "E2E Test Game 0.3 · web, level 1 to the flag" },
			{ id: "c4-i2", text: "Playtest notes from two friends" },
		],
		tasks: [
			{
				id: "c4-t1",
				text: "Five players outside the team play level 1, notes written up",
			},
			{
				id: "c4-t2",
				text: "The second pit fixed from what the players hit",
			},
			{ id: "c4-t3", text: "Level 2 greyboxed, start to flag" },
		],
		required: [
			{ name: "Publish a devlog about the prototype", doneOn: "2026-12-11" },
		],
		sprints: [
			{
				direction: "toward",
				devlogs: [
					{
						id: "d13",
						on: "2026-12-11",
						title: "Devlog #13: Dan joins, five strangers play",
						text: "Week 1: Dan joined us as a level designer. On Saturday five players from a local game-dev meetup played level 1: four reached the flag, three fell into the second pit at least twice. The notes are on the task.",
						views: 66,
						applause: 8,
					},
				],
				artifacts: [
					{
						id: "a15",
						type: "Document",
						name: "Playtest notes, five players",
						link: doc("playtest-5"),
						by: DAN.name,
						on: "2026-12-12",
						proves: {
							task: "c4-t1",
							seen: {
								match: "Matches",
								note: "Five players outside the team, each with where they fell and how long it took.",
							},
						},
					},
				],
				team: [
					{ on: "2026-12-09", joins: DAN },
					{ on: "2026-12-09", closes: "v2" },
				],
			},
			{
				direction: "toward",
				devlogs: [
					{
						id: "d14",
						on: "2026-12-18",
						title: "Devlog #14: The second pit",
						text: "Week 2: the second pit is a tile narrower and a candy now shows where to jump from. Dan replayed the notes' worst run on the new build and made it across.",
						views: 58,
						applause: 6,
					},
				],
				artifacts: [
					{
						id: "a16",
						type: "ExecutableBuild",
						name: "E2E Test Game 0.4 · web",
						link: LINKS.itch,
						by: ANA.name,
						on: "2026-12-18",
						proves: {
							task: "c4-t2",
							seen: {
								match: "Matches",
								note: "The second pit is narrower and a candy marks the take-off.",
							},
						},
					},
				],
			},
			{
				direction: "stalled",
				devlogs: [
					{
						id: "d15",
						on: "2026-12-24",
						title: "Devlog #15: Holidays",
						text: "Week 3: Cleo left the team — she has a full-time job now. Dan sketched three layouts for level 2 on paper and could not choose; nothing is in the engine yet.",
						views: 30,
						applause: 2,
					},
				],
				artifacts: [],
				team: [{ on: "2026-12-23", leaves: CLEO.id }],
				missed: [BO.id],
			},
			{
				direction: "toward",
				devlogs: [
					{
						id: "d16",
						on: "2027-01-02",
						title: "Devlog #16: Level 2 in grey",
						text: "Week 4: level 2 is greyboxed from the start to the flag — a frozen river with ice that cracks under the gnome. It is in the same web build.",
						views: 61,
						applause: 7,
					},
				],
				artifacts: [
					{
						id: "a17",
						type: "ExecutableBuild",
						name: "E2E Test Game 0.5 · web",
						link: LINKS.itch,
						by: DAN.name,
						on: "2027-01-02",
						proves: {
							task: "c4-t3",
							seen: {
								match: "Matches",
								note: "Level 2 in grey boxes, playable from the start to the flag.",
							},
						},
					},
				],
			},
		],
		verdict: "StageClosed",
		because:
			"Five strangers played, the pit is fixed and level 2 stands: the core works and the style was chosen before; sprint 3 stood still over the holidays.",
	},
	{
		number: 5,
		stage: "Preparing a demo version",
		nextStage: "Taking and analyzing metrics",
		start: "2027-01-11",
		goal: "A demo of the first two levels at near-final quality, public on itch.io and Steam.",
		inputs: [{ id: "c5-i1", text: "E2E Test Game 0.5 · web, levels 1–2" }],
		tasks: [
			{
				id: "c5-t1",
				text: "Levels 1 and 2 at final art, with sound and music",
			},
			{ id: "c5-t2", text: "The demo public on itch.io" },
			{ id: "c5-t3", text: "Three devlog posts about the demo" },
		],
		required: [
			{ name: "Publish at least 3 devlog posts", doneOn: "2027-02-05" },
			{ name: "Upload a demo and add a link", doneOn: "2027-02-05" },
			{ name: "Open the game's store page", doneOn: null },
		],
		sprints: [
			{
				direction: "toward",
				devlogs: [
					{
						id: "d17",
						on: "2027-01-15",
						title: "Devlog #17: Level 1 in colour",
						text: "Week 1: level 1 has its final art — snowy roofs, the candy shop, the gnome's walk cycle in eight frames. We bought a music pack since Cleo left.",
						views: 80,
						applause: 10,
					},
				],
				artifacts: [
					{
						id: "a18",
						type: "Image",
						name: "Level 1, final art",
						link: doc("level-1-art.png"),
						by: BO.name,
						on: "2027-01-15",
					},
				],
			},
			{
				direction: "sideways",
				devlogs: [
					{
						id: "d18",
						on: "2027-01-22",
						title: "Devlog #18: A trailer",
						text: "Week 2: we cut a 45-second trailer from level 1 and posted it. Level 2 has no art yet, and the demo build is not started.",
						views: 120,
						applause: 15,
					},
				],
				artifacts: [
					{
						id: "a19",
						type: "Video",
						name: "Teaser trailer",
						link: LINKS.trailer,
						by: BO.name,
						on: "2027-01-22",
					},
				],
			},
			{
				direction: "toward",
				devlogs: [
					{
						id: "d19",
						on: "2027-01-29",
						title: "Devlog #19: The frozen river",
						text: "Week 3: level 2 has its final art and both levels have music and sound. The demo build runs both levels back to back.",
						views: 95,
						applause: 11,
					},
				],
				artifacts: [
					{
						id: "a20",
						type: "ExecutableBuild",
						name: "Demo 0.9 · web",
						link: LINKS.demo,
						by: ANA.name,
						on: "2027-01-29",
						proves: {
							task: "c5-t1",
							seen: {
								match: "Matches",
								note: "Both levels at final art, with music and sound effects.",
							},
						},
					},
				],
			},
			{
				direction: "toward",
				devlogs: [
					{
						id: "d20",
						on: "2027-02-05",
						title: "Devlog #20: The demo is out",
						text: "Week 4: the demo is public on itch.io — levels 1 and 2, about ten minutes. The Steam page is not open yet: we have not paid the fee or made the capsule art.",
						views: 160,
						applause: 22,
					},
				],
				artifacts: [
					{
						id: "a21",
						type: "ExecutableBuild",
						name: "Demo 1.0 · web",
						link: LINKS.demo,
						by: ANA.name,
						on: "2027-02-05",
						proves: {
							task: "c5-t2",
							seen: {
								match: "Matches",
								note: "The demo plays on itch.io: two levels, start to flag.",
							},
						},
					},
				],
				links: { "itch.io demo": LINKS.demo },
			},
		],
		verdict: "GoalMet",
		because:
			"The demo is public and every task shown, but the stage also asks for a live Steam page, and there is none.",
	},
	{
		number: 6,
		stage: "Preparing a demo version",
		nextStage: "Taking and analyzing metrics",
		start: "2027-02-15",
		goal: "The Steam page live with the demo on it, and the first wishlists counted.",
		inputs: [{ id: "c6-i1", text: "Demo 1.0 on itch.io, levels 1–2" }],
		tasks: [
			{ id: "c6-t1", text: "Capsule art and five screenshots for Steam" },
			{ id: "c6-t2", text: "The Steam page live, with the demo" },
			{ id: "c6-t3", text: "The wishlists of the first week, written down" },
		],
		required: [
			{ name: "Publish at least 3 devlog posts", doneOn: "2027-02-05" },
			{ name: "Upload a demo and add a link", doneOn: "2027-02-05" },
			{ name: "Open the game's store page", doneOn: "2027-03-05" },
		],
		sprints: [
			{
				direction: "toward",
				devlogs: [
					{
						id: "d21",
						on: "2027-02-19",
						title: "Devlog #21: The capsule",
						text: "Week 1: Bo drew the capsule art — the gnome mid-jump over a candy-cane sign — and we took five screenshots. The Steam fee is paid.",
						views: 90,
						applause: 9,
					},
				],
				artifacts: [
					{
						id: "a22",
						type: "Image",
						name: "Steam capsule and screenshots",
						link: doc("steam-art"),
						by: BO.name,
						on: "2027-02-19",
						proves: {
							task: "c6-t1",
							seen: {
								match: "Matches",
								note: "A capsule with the gnome and the title, and five screenshots from both levels.",
							},
						},
					},
				],
			},
			{
				direction: "stalled",
				devlogs: [
					{
						id: "d22",
						on: "2027-02-26",
						title: "Devlog #22: Waiting for Valve",
						text: "Week 2: the store page is in Steam's review. We are waiting; nothing else moved.",
						views: 50,
						applause: 3,
					},
				],
				artifacts: [],
			},
			{
				direction: "toward",
				devlogs: [
					{
						id: "d23",
						on: "2027-03-05",
						title: "Devlog #23: Wishlist us",
						text: "Week 3: the Steam page is live with the demo on it. Steam asked for a bigger logo on the capsule; Bo fixed it the same day.",
						views: 210,
						applause: 30,
					},
				],
				artifacts: [
					{
						id: "a23",
						type: "Other",
						name: "Steam page",
						link: LINKS.steam,
						by: ANA.name,
						on: "2027-03-05",
						proves: {
							task: "c6-t2",
							seen: {
								match: "Matches",
								note: "The store page is live with a Download Demo button.",
							},
						},
					},
				],
				links: { steam: LINKS.steam },
				project: { platform: "PC (Steam), Web" },
			},
			{
				direction: "toward",
				devlogs: [
					{
						id: "d24",
						on: "2027-03-12",
						title: "Devlog #24: 412 wishlists",
						text: "Week 4: the first week on Steam brought 412 wishlists and 1,900 demo plays. The numbers are in a sheet on the task.",
						views: 240,
						applause: 28,
					},
				],
				artifacts: [
					{
						id: "a24",
						type: "Document",
						name: "Wishlists, week 1",
						link: doc("wishlists-1"),
						by: ANA.name,
						on: "2027-03-12",
						proves: {
							task: "c6-t3",
							seen: {
								match: "Matches",
								note: "Daily wishlists and demo plays for the first week.",
							},
						},
					},
				],
			},
		],
		verdict: "StageClosed",
		because:
			"The Steam page is live with the demo, so the stage's goal is shown; sprint 2 only waited for Steam's review.",
	},
	{
		number: 7,
		stage: "Taking and analyzing metrics",
		nextStage: "Preparing a release version",
		start: "2027-03-22",
		goal: "We know where demo players quit and why, and we have decided what the full game fixes, cuts and keeps.",
		inputs: [
			{ id: "c7-i1", text: "The demo on Steam and itch.io" },
			{ id: "c7-i2", text: "Wishlists, week 1" },
		],
		tasks: [
			{
				id: "c7-t1",
				text: "Where players quit the demo, from the play data",
			},
			{ id: "c7-t2", text: "Ten players' comments read and grouped" },
			{
				id: "c7-t3",
				text: "The decisions: what the full game fixes, cuts and keeps",
			},
		],
		required: [
			{ name: "Publish a devlog about metrics", doneOn: "2027-04-16" },
		],
		sprints: [
			{
				direction: "toward",
				devlogs: [
					{
						id: "d25",
						on: "2027-03-26",
						title: "Devlog #25: Where they quit",
						text: "Week 1: we logged deaths and quits in the demo. 38% of players quit in level 2 at the cracking ice; few quit in level 1. Bo is back to his old hours.",
						views: 110,
						applause: 12,
					},
				],
				artifacts: [
					{
						id: "a25",
						type: "Document",
						name: "Demo play data",
						link: doc("play-data"),
						by: ANA.name,
						on: "2027-03-26",
						proves: {
							task: "c7-t1",
							seen: {
								match: "Matches",
								note: "Deaths and quits per level; most quits at the cracking ice in level 2.",
							},
						},
					},
				],
				team: [{ on: "2027-03-23", hours: BO.id, to: { from: 10, to: 15 } }],
			},
			{
				direction: "stalled",
				devlogs: [
					{
						id: "d26",
						on: "2027-04-02",
						title: "Devlog #26: Watching the wishlists",
						text: "Week 2: we watched the wishlists climb to 1,100 and waited for more comments before deciding anything.",
						views: 70,
						applause: 5,
					},
				],
				artifacts: [],
			},
			{
				direction: "toward",
				devlogs: [
					{
						id: "d27",
						on: "2027-04-09",
						title: "Devlog #27: What you told us",
						text: "Week 3: we read every comment and grouped ten players' notes: the ice is unfair, the candies feel pointless, the music is loved.",
						views: 120,
						applause: 14,
					},
				],
				artifacts: [
					{
						id: "a26",
						type: "Document",
						name: "Player comments, grouped",
						link: doc("comments"),
						by: DAN.name,
						on: "2027-04-09",
						proves: {
							task: "c7-t2",
							seen: {
								match: "Matches",
								note: "Ten players' comments grouped by theme, with counts.",
							},
						},
					},
				],
			},
			{
				direction: "toward",
				devlogs: [
					{
						id: "d28",
						on: "2027-04-16",
						title: "Devlog #28: The full game is six levels",
						text: "Week 4: the decisions. The ice gets a warning crack before it breaks. Candies unlock a hat for the gnome. The full game is six levels, not eight: levels 7 and 8 are cut. Release is planned for June.",
						views: 150,
						applause: 19,
					},
				],
				artifacts: [
					{
						id: "a27",
						type: "Document",
						name: "Decisions for the full game",
						link: doc("decisions"),
						by: ANA.name,
						on: "2027-04-16",
						proves: {
							task: "c7-t3",
							seen: {
								match: "Matches",
								note: "What is fixed, cut and kept, each tied to the data or the comments.",
							},
						},
					},
				],
			},
		],
		verdict: "StageClosed",
		because:
			"Where players quit is measured and turned into decisions; sprint 2 waited on the numbers instead of deciding.",
	},
	{
		number: 8,
		stage: "Preparing a release version",
		nextStage: "Support",
		start: "2027-04-26",
		goal: "All six levels built and the content locked, so only bugs are left.",
		inputs: [
			{ id: "c8-i1", text: "Decisions for the full game" },
			{ id: "c8-i2", text: "Levels 1–2 from the demo" },
		],
		tasks: [
			{ id: "c8-t1", text: "Levels 3 to 6 built and playable" },
			{
				id: "c8-t2",
				text: "The candy hat and the ice warning in the game",
			},
			{
				id: "c8-t3",
				text: "Content locked: all six levels final, nothing new added",
			},
		],
		required: [
			{ name: "Publish at least 3 devlog posts", doneOn: "2027-05-08" },
		],
		sprints: [
			{
				direction: "toward",
				devlogs: [
					{
						id: "d29",
						on: "2027-04-30",
						title: "Devlog #29: Levels 3 and 4",
						text: "Week 1: levels 3 and 4 are playable — a pine forest and the villain's ice fort gate. The ice now cracks once before it breaks.",
						views: 130,
						applause: 15,
					},
				],
				artifacts: [
					{
						id: "a28",
						type: "ExecutableBuild",
						name: "E2E Test Game 0.8 · PC",
						link: LINKS.steam,
						by: DAN.name,
						on: "2027-04-30",
					},
				],
			},
			{
				direction: "toward",
				devlogs: [
					{
						id: "d30",
						on: "2027-05-07",
						title: "Devlog #30: Six levels",
						text: "Week 2: levels 5 and 6 are in, and candies unlock the hat. Ana has fewer hours from now on — her day job grew.",
						views: 140,
						applause: 16,
					},
				],
				artifacts: [
					{
						id: "a29",
						type: "ExecutableBuild",
						name: "E2E Test Game 0.9 · PC",
						link: LINKS.steam,
						by: DAN.name,
						on: "2027-05-07",
						proves: {
							task: "c8-t1",
							seen: {
								match: "Matches",
								note: "Six levels, each playable from the start to the flag.",
							},
						},
					},
					{
						id: "a30",
						type: "Video",
						name: "Candy hat and ice warning",
						link: `${LINKS.trailer}-hat`,
						by: ANA.name,
						on: "2027-05-08",
						proves: {
							task: "c8-t2",
							seen: {
								match: "Matches",
								note: "The gnome wearing the candy hat, and ice that cracks before it breaks.",
							},
						},
					},
				],
				team: [{ on: "2027-05-05", hours: ANA.id, to: { from: 10, to: 15 } }],
			},
			{
				direction: "idle",
				devlogs: [],
				artifacts: [],
				missed: [ANA.id, BO.id, DAN.id],
			},
			{
				direction: "sideways",
				devlogs: [
					{
						id: "d31",
						on: "2027-05-21",
						title: "Devlog #31: A boss nobody asked for",
						text: "Week 4: Dan built a new boss for level 6 — the villain's snow golem, three phases. It is half done, and level 6 is not final because of it.",
						views: 160,
						applause: 20,
					},
				],
				artifacts: [
					{
						id: "a31",
						type: "ExecutableBuild",
						name: "E2E Test Game 0.95 · PC",
						link: LINKS.steam,
						by: DAN.name,
						on: "2027-05-21",
						proves: {
							task: "c8-t3",
							seen: {
								match: "DoesNotMatch",
								note: "Level 6 has a new, half-built boss: content was added, not locked.",
							},
						},
					},
				],
			},
		],
		verdict: "GoalMissed",
		because:
			"Six levels are in, but a new boss was added in sprint 4 and the content is not locked; sprint 3 had nothing.",
	},
	{
		number: 9,
		stage: "Preparing a release version",
		nextStage: "Support",
		start: "2027-05-31",
		goal: "E2E Test Game is released on Steam.",
		inputs: [{ id: "c9-i1", text: "E2E Test Game 0.95 · PC, six levels" }],
		tasks: [
			{ id: "c9-t1", text: "The snow golem finished, and the content locked" },
			{ id: "c9-t2", text: "No open crash bugs in the release build" },
			{ id: "c9-t3", text: "The game released on Steam" },
		],
		required: [
			{ name: "Publish at least 3 devlog posts", doneOn: "2027-05-08" },
		],
		sprints: [
			{
				direction: "toward",
				devlogs: [
					{
						id: "d32",
						on: "2027-06-04",
						title: "Devlog #32: The golem falls",
						text: "Week 1: the snow golem is finished — three phases, the last one on a melting floor. Content is locked: from now on, only fixes.",
						views: 170,
						applause: 21,
					},
				],
				artifacts: [
					{
						id: "a32",
						type: "ExecutableBuild",
						name: "E2E Test Game 1.0 RC1 · PC",
						link: LINKS.steam,
						by: DAN.name,
						on: "2027-06-04",
						proves: {
							task: "c9-t1",
							seen: {
								match: "Matches",
								note: "The boss fight plays through all three phases; the changelog says content locked.",
							},
						},
					},
				],
			},
			{
				direction: "toward",
				devlogs: [
					{
						id: "d33",
						on: "2027-06-11",
						title: "Devlog #33: Bug hunt",
						text: "Week 2: 41 bugs found by ten testers, 33 fixed, both crashes among them. Release date set: 25 June.",
						views: 150,
						applause: 14,
					},
				],
				artifacts: [],
			},
			{
				direction: "toward",
				devlogs: [
					{
						id: "d34",
						on: "2027-06-18",
						title: "Devlog #34: No crashes",
						text: "Week 3: the bug list is down to six cosmetic ones; no crashes left. The release build is uploaded to Steam.",
						views: 180,
						applause: 18,
					},
				],
				artifacts: [
					{
						id: "a33",
						type: "Document",
						name: "Bug list before release",
						link: doc("bugs"),
						by: ANA.name,
						on: "2027-06-18",
						proves: {
							task: "c9-t2",
							seen: {
								match: "Matches",
								note: "Six open bugs, all cosmetic; the crashes are closed.",
							},
						},
					},
				],
			},
			{
				direction: "toward",
				devlogs: [
					{
						id: "d35",
						on: "2027-06-25",
						title: "Devlog #35: It's out",
						text: "Week 4: E2E Test Game is out on Steam. 1,300 copies in the first two days and 47 reviews, 91% positive.",
						views: 600,
						applause: 64,
					},
				],
				artifacts: [
					{
						id: "a34",
						type: "Other",
						name: "E2E Test Game on Steam",
						link: LINKS.steam,
						by: ANA.name,
						on: "2027-06-25",
						proves: {
							task: "c9-t3",
							seen: {
								match: "Matches",
								note: "The store page sells the game, with a release date of 25 June 2027.",
							},
						},
					},
				],
			},
		],
		verdict: "StageClosed",
		because:
			"The game is released on Steam with every task shown: moving to Support is the release.",
	},
];
