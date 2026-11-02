import { CURATOR_STAGE_BRIEFS, CURATOR_STAGE_GOALS } from "@/config/checkpoint";
import { teamCapacity } from "@/lib/checkpoints/capacity";
import { lensWeights } from "@/lib/checkpoints/lenses";
import type { CheckpointPicture } from "@/lib/checkpoints/picture";
import type { CuratorTask } from "@/services/checkpoints/ai-review";
import type { CuratorTeam } from "@/types/checkpoint-curator";

/**
 * E2E Test Game (GDHUB-133): a classic 2D side-scrolling platformer — run,
 * jump, stomp, collect, reach the flag. A gnome saves Christmas: he collects
 * candies, and the villain has kidnapped the Snow Maiden. Nothing in it is
 * invented beyond the genre, so every review and verdict can be read against
 * what is known to have happened.
 *
 * One checkpoint, 2–29 November 2026, on Prototyping, with every direction:
 * - Sprint 1, toward: the jump with coyote time, in a web build.
 * - Sprint 2, sideways: a title screen and a logo instead of the level; Bo
 *   cuts his hours and a level designer is sought.
 * - Sprint 3, idle: nothing at all.
 * - Sprint 4, toward: level 1 to the flag on itch.io; the playtest has two
 *   players, not five, so that task is not delivered and the goal is missed.
 */

export const E2E_GOAL = "A playable jump and the first level anyone can open.";

const TASKS = {
	jump: { id: "t1", text: "Jump with coyote time and a jump buffer" },
	level: { id: "t2", text: "Level 1, from the start to the flag" },
	build: { id: "t3", text: "A web build anyone can open on itch.io" },
	players: { id: "t4", text: "Five players outside the team reach the flag" },
};

const LINKS = {
	jump: "https://e2e-test-game.itch.io/jump-test",
	game: "https://e2e-test-game.itch.io/game",
	title: "https://e2e-test-game.example/title-screen.png",
	notes: "https://docs.example/e2e-test-game/playtest",
};

const DEVLOGS = {
	jump: "Week 1: the gnome runs and jumps. Coyote time is 0.1 s and the jump buffer 0.12 s, so a late press still jumps. The web build is on itch.io.",
	title:
		"Week 2: we made the title screen — the gnome on a candy-cane sign, snow falling — and the logo. Bo can give fewer hours for the rest of the month, so we are looking for a level designer.",
	level:
		"Week 4: level 1 is done, from the snowy start to the flag, with candies to collect, two kinds of enemies to stomp and the villain's sleigh flying off with the Snow Maiden at the end. It is on itch.io.",
	playtest:
		"Week 4: two friends played level 1. Both reached the flag; one fell into the second pit four times.",
};

export const E2E_WORKFLOW = {
	currentStage: "Prototyping",
	nextStage: "Preparing a demo version",
	description: CURATOR_STAGE_BRIEFS.Prototyping ?? null,
	goal: CURATOR_STAGE_GOALS.Prototyping ?? null,
	lenses: lensWeights("Prototyping"),
	requiredTasks: [{ name: "Playable prototype", done: false }],
};

const ana = {
	id: "tm_ana",
	name: "Ana Sousa",
	role: "Programmer",
	level: "Middle",
	hours: { from: 15, to: 20 },
};
const bo = {
	id: "tm_bo",
	name: "Bo Lindqvist",
	role: "2D artist",
	level: "Junior",
	hours: { from: 10, to: 15 },
};

/** The team as the curator reads it after `sprint`; Bo's hours drop in sprint 2, sprint 3 nobody confirmed. */
export const e2eTeam = (sprint: number): CuratorTeam => {
	const boHours = sprint >= 2 ? { from: 5, to: 10 } : bo.hours;
	const weeks = [true, true, false, true].slice(0, sprint);
	return {
		...teamCapacity([
			{ timeForWork: [ana.hours.from, ana.hours.to] },
			{ timeForWork: [boHours.from, boHours.to] },
		]),
		people: [
			{
				name: ana.name,
				role: ana.role,
				level: ana.level,
				hoursPerWeek: ana.hours,
				weeks,
				joinedOn: null,
			},
			{
				name: bo.name,
				role: bo.role,
				level: bo.level,
				hoursPerWeek: boHours,
				weeks,
				joinedOn: null,
			},
		],
		openings:
			sprint >= 2
				? [{ role: "Level designer", postedOn: "2026-11-12", applied: 2 }]
				: [],
	};
};

const proved = { match: "Matches" as const, note: null };

/** The tasks as each sprint's review reads them, with what the evidence was seen to show. */
export const e2eTasks = (sprint: number): CuratorTask[] => [
	{
		...TASKS.jump,
		cut: false,
		firstWording: null,
		evidence: [
			{ type: "ExecutableBuild", name: "Jump test 0.1 · web", seen: proved },
		],
	},
	{
		...TASKS.level,
		cut: false,
		firstWording: null,
		evidence:
			sprint >= 4
				? [
						{
							type: "ExecutableBuild",
							name: "E2E Test Game 0.3 · web",
							seen: proved,
						},
					]
				: [],
	},
	{
		...TASKS.build,
		cut: false,
		firstWording: null,
		evidence:
			sprint >= 4
				? [
						{
							type: "ExecutableBuild",
							name: "E2E Test Game 0.3 · web",
							seen: proved,
						},
					]
				: [],
	},
	{
		...TASKS.players,
		cut: false,
		firstWording: null,
		evidence:
			sprint >= 4
				? [
						{
							type: "Document",
							name: "Playtest notes",
							seen: {
								match: "DoesNotMatch" as const,
								note: "Notes from two players, both friends of the team, not five from outside it.",
							},
						},
					]
				: [],
	},
];

/** What each sprint showed. */
export const E2E_SPRINTS: Record<
	number,
	{ devlogs: string[]; artifacts: { type: string; name: string }[] }
> = {
	1: {
		devlogs: [DEVLOGS.jump],
		artifacts: [{ type: "ExecutableBuild", name: "Jump test 0.1 · web" }],
	},
	2: {
		devlogs: [DEVLOGS.title],
		artifacts: [{ type: "Image", name: "Title screen and logo" }],
	},
	3: { devlogs: [], artifacts: [] },
	4: {
		devlogs: [DEVLOGS.level, DEVLOGS.playtest],
		artifacts: [
			{ type: "ExecutableBuild", name: "E2E Test Game 0.3 · web" },
			{ type: "Document", name: "Playtest notes" },
		],
	},
};

/** Every devlog of the run, for the verdict. */
export const E2E_DEVLOGS = [
	{ publishedAt: "2026-11-07", content: DEVLOGS.jump },
	{ publishedAt: "2026-11-13", content: DEVLOGS.title },
	{ publishedAt: "2026-11-27", content: DEVLOGS.level },
	{ publishedAt: "2026-11-28", content: DEVLOGS.playtest },
];

const artifactOf = (id: string, type: string, name: string, link: string) => ({
	id,
	type,
	name,
	link,
});

/** The project at each boundary: 0 is day 1, then the end of each sprint. Sprint 3 changes nothing but views. */
export const e2ePicture = (point: number): CheckpointPicture => {
	const after = (sprint: number) => point >= sprint;
	const artifacts = [
		after(1) &&
			artifactOf("a1", "ExecutableBuild", "Jump test 0.1 · web", LINKS.jump),
		after(2) && artifactOf("a2", "Image", "Title screen and logo", LINKS.title),
		after(4) &&
			artifactOf(
				"a3",
				"ExecutableBuild",
				"E2E Test Game 0.3 · web",
				LINKS.game,
			),
		after(4) && artifactOf("a4", "Document", "Playtest notes", LINKS.notes),
	].filter((row) => !!row);
	const views = [40, 112, 190, 214, 452][point];
	return {
		version: 1,
		at: ["2026-11-02", "2026-11-08", "2026-11-15", "2026-11-22", "2026-11-29"][
			point
		],
		point,
		project: {
			stage: "Prototyping",
			description: after(2)
				? "A gnome saves Christmas: collect candies, stomp the villain's minions and get the Snow Maiden back. A classic 2D platformer."
				: "A gnome saves Christmas. A classic 2D platformer.",
			genre: "Platformer",
			platform: "Web",
			setting: "Winter",
			visualStyle: "Pixel art",
			links: after(4) ? { itch: LINKS.game } : {},
		},
		team: {
			members: [ana, after(2) ? { ...bo, hours: { from: 5, to: 10 } } : bo].map(
				({ id, name, role, level, hours }) => ({
					id,
					name,
					role,
					level,
					hours,
				}),
			),
			invitations: [],
			vacancies: after(2)
				? [
						{
							id: "v1",
							title: "Level designer",
							status: "Published",
							applicants: after(4) ? 3 : 2,
						},
					]
				: [],
		},
		work: {
			artifacts: artifacts.map(({ id, type, name }) => ({ id, type, name })),
			devlogs: [
				after(1) && { id: "d1", number: 1 },
				after(2) && { id: "d2", number: 2 },
				after(4) && { id: "d3", number: 3 },
				after(4) && { id: "d4", number: 4 },
			].filter((row) => !!row),
		},
		signals: {
			projectViews: views,
			devlogViews: Math.round(views * 0.6),
			applause: [0, 6, 9, 9, 31][point],
		},
		plan: {
			inputs: [],
			tasks: [
				{ ...TASKS.jump, cut: false, proved: after(1) },
				{ ...TASKS.level, cut: false, proved: after(4) },
				{ ...TASKS.build, cut: false, proved: after(4) },
				{ ...TASKS.players, cut: false, proved: false },
			],
		},
	};
};

/** The verdict's goal card, as the evidence check left it on day 29. */
export const E2E_ITEMS = [
	{
		id: "i1",
		kind: "Input" as const,
		text: "A concept page and a mood board of the winter town",
		originalText: null,
		cut: false,
		evidence: [],
	},
	...[
		[
			TASKS.jump,
			"ExecutableBuild",
			"Jump test 0.1 · web",
			LINKS.jump,
			"Matches",
		],
		[
			TASKS.level,
			"ExecutableBuild",
			"E2E Test Game 0.3 · web",
			LINKS.game,
			"Matches",
		],
		[
			TASKS.build,
			"ExecutableBuild",
			"E2E Test Game 0.3 · web",
			LINKS.game,
			"Matches",
		],
		[TASKS.players, "Document", "Playtest notes", LINKS.notes, "DoesNotMatch"],
	].map(([task, type, name, link, match]) => ({
		...(task as { id: string; text: string }),
		kind: "Outcome" as const,
		originalText: null,
		cut: false,
		addedAt: null,
		evidence: [
			{
				match: match as "Matches" | "DoesNotMatch",
				matchNote:
					match === "Matches" ? null : "Two players, both friends of the team.",
				artifact: {
					type: type as string,
					name: name as string,
					description: null,
					link: link as string,
					checkStatus: "Readable" as const,
					checkNote: null,
				},
			},
		],
	})),
];

/**
 * Call 2 of a human curator's checkpoint, reviewing sprint 1. The jump and the
 * team's hours are discussed; the audience never comes up, so the marketing
 * lens must come back empty.
 */
export const E2E_CALL_TRANSCRIPT = `So the jump build is up on itch, I played it this morning. The coyote time feels right, I could jump a beat after the edge and it still worked. The buffer too.
Good. That was the first task, so that one is done, the build is the proof.
What about the level? Nothing yet, we only have the gnome on a flat floor.
Right. Bo, how much time do you have the next weeks?
Less, honestly. Maybe five to ten hours a week, I have another contract.
Then the level has to come from Ana, and the art for it should be tiles you can reuse. Let's agree that by the next call there is a greybox of level 1 from the start to the flag.
And the candies and enemies can wait, the path to the flag first.
Agreed. The jump moves us toward the goal; the level is where we stand still so far.`;
