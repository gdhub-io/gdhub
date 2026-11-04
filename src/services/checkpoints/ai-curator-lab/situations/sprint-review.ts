import { teamCapacity } from "@/lib/checkpoints/capacity";
import type { CuratorTeam } from "@/types/checkpoint-curator";
import {
	type LabLanguage,
	type Situation,
	say,
	type sprintReviewInput,
} from "../schemas";
import { BO, DAN, e2eCheckpoint, openTask } from "./e2e-test-game";

/**
 * Public, long-lived media, read live on Run like a devlog's own links. E2E
 * Test Game has no real screenshots, so both are media that are not the game.
 */
const LANDSCAPE =
	"https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Fronalpstock_big.jpg/960px-Fronalpstock_big.jpg";
const VIDEO = "https://www.youtube.com/watch?v=aqz-KE-bpKQ";

/** The level build the variants show in place of the road's own. */
const LEVEL_BUILD = {
	type: "ExecutableBuild",
	name: "E2E Test Game 0.2 · web",
};

const TEXT = {
	levelSeen: "Level 1 plays from the snowy start to the flag in the browser.",
	halfSeen: "Level 1 up to the second pit; there is no flag yet.",
	candySeen: "A photo of a candy cane on a desk; no level in it.",
	focusAfter1: ["Greybox level 1 to the flag", "Book the playtest"],
	focusAfter3: [
		"Put level 1 on itch.io",
		"Five players outside the team reach the flag",
	],
	trailerDevlog:
		"Week 1: we cut a 30-second teaser from the title art and posted it on X. The jump is not started yet.",
	halfDevlog:
		"Week 2: level 1 is greyboxed to the second pit; the flag and the enemies come next week.",
	mobileDevlog:
		"Week 2: instead of the level we made the jump test run on phones — most of our testers will play there. Touch controls are in.",
	noArtistDevlog:
		"Week 2: Bo, our only artist, left the team for another job. Nobody draws now, so level 1 has no tiles. Ana kept tuning the jump.",
	newMemberDevlog:
		"Week 2: Dan joined us as a level designer on Friday and greyboxed level 1 to the second pit.",
	onCourseDevlog:
		"Week 3: level 1 is done from the start to the flag, with candies and both enemies, and it is on itch.io.",
};

/** The team with its people edited, its capacity counted again from them. */
const withPeople = (
	team: CuratorTeam,
	people: CuratorTeam["people"],
): CuratorTeam => ({
	...team,
	...teamCapacity(
		people.map((person) => ({
			timeForWork: person.hoursPerWeek
				? [person.hoursPerWeek.from, person.hoursPerWeek.to]
				: [],
		})),
	),
	people,
});

export const sprintReviewSituations = (
	language: LabLanguage,
): Situation<typeof sprintReviewInput>[] => {
	const cp = e2eCheckpoint(3);
	const [jump, level, build, players] = cp.tasks(1);
	const after1 = { journal: [], focus: TEXT.focusAfter1, lastDirection: null };
	const sprint1 = cp.sprintReview(1);
	const sprint2 = cp.sprintReview(2, after1);
	/** Sprint 2 as it might have gone: the road's level untouched, the rest the variant's. */
	const variant2 = {
		...sprint2,
		tasks: [jump, openTask(level), openTask(build), openTask(players)],
	};
	const levelWith = (
		match: "Matches" | "Partly" | "DoesNotMatch",
		note: string,
		type = LEVEL_BUILD.type,
	) => ({
		...openTask(level),
		evidence: [{ type, name: LEVEL_BUILD.name, seen: { match, note } }],
	});
	/** Day 15 without the artist: Bo left in sprint 2, nobody draws, and the level has no tiles. */
	const shortOfArt = (openings: CuratorTeam["openings"]) => ({
		...variant2,
		devlogs: [TEXT.noArtistDevlog],
		artifacts: [],
		team: {
			...withPeople(
				sprint2.team,
				sprint2.team.people.filter((person) => person.name !== BO.name),
			),
			openings,
		},
	});

	return [
		{
			id: "good-week",
			label: say(
				language,
				"Sprint 1: the jump, as it happened",
				"Спринт 1: прыжок, как было",
			),
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
			id: "sideways",
			label: say(
				language,
				"Sprint 2: a title screen instead of the level, as it happened",
				"Спринт 2: титульный экран вместо уровня, как было",
			),
			input: sprint2,
		},
		{
			id: "idle",
			label: say(
				language,
				"Sprint 3: nothing done, as it happened",
				"Спринт 3: ничего не сделано, как было",
			),
			input: cp.sprintReview(3, after1),
		},
		{
			// Day 15: sprint 2 showed nothing, and Bo did not confirm it.
			id: "quiet",
			label: say(
				language,
				"No devlog, the artist missing",
				"Нет девлога, художник выпал",
			),
			input: {
				...variant2,
				devlogs: [],
				artifacts: [],
				team: {
					...variant2.team,
					people: variant2.team.people.map((person) =>
						person.name === BO.name
							? { ...person, weeks: [true, false] }
							: person,
					),
				},
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
				tasks: [jump, level, build, players].map(openTask),
				devlogs: [TEXT.trailerDevlog],
				artifacts: [{ type: "Video", name: "Teaser trailer" }],
			},
		},
		{
			// Day 15: the last focus asked for the level; the team made the jump
			// test run on phones instead — another route, and not the goal's.
			id: "own-route",
			label: say(
				language,
				"Day 15, the team went its own way",
				"День 15, команда пошла своим путём",
			),
			input: {
				...variant2,
				devlogs: [TEXT.mobileDevlog],
				artifacts: [
					{ type: "ExecutableBuild", name: "Jump test 0.2 · mobile web" },
				],
			},
		},
		{
			// Day 15: the only artist dropped out and the level stalled; nobody is being sought.
			id: "short-artist",
			label: say(
				language,
				"Day 15, no artist and no open position",
				"День 15, художника нет и вакансии нет",
			),
			input: shortOfArt([]),
		},
		{
			// The same, with a position already open.
			id: "short-artist-open",
			label: say(
				language,
				"Day 15, no artist, a position already open",
				"День 15, художника нет, вакансия уже открыта",
			),
			input: shortOfArt([
				{ role: BO.role, postedOn: "2026-11-10", applied: 2 },
			]),
		},
		{
			// A level designer joined mid-sprint and the level moved.
			id: "new-member",
			label: say(
				language,
				"Day 15, a level designer joined mid-sprint",
				"День 15, в середине спринта пришёл левел-дизайнер",
			),
			input: {
				...variant2,
				tasks: [
					jump,
					levelWith("Partly", TEXT.halfSeen),
					openTask(build),
					openTask(players),
				],
				devlogs: [TEXT.newMemberDevlog],
				artifacts: [LEVEL_BUILD],
				team: withPeople(variant2.team, [
					...variant2.team.people,
					{
						name: DAN.name,
						role: DAN.role,
						level: DAN.level,
						hoursPerWeek: DAN.hours,
						weeks: [false, true],
						joinedOn: "2026-11-13",
					},
				]),
			},
		},
		{
			// Day 15: the level is ticked, but its image is not a level.
			id: "mismatch",
			label: say(
				language,
				"Day 15, the evidence does not match its task",
				"День 15, доказательство не совпадает с задачей",
			),
			input: {
				...variant2,
				tasks: [
					jump,
					levelWith("DoesNotMatch", TEXT.candySeen, "Image"),
					openTask(build),
					openTask(players),
				],
				devlogs: [TEXT.halfDevlog],
				artifacts: [{ type: "Image", name: LEVEL_BUILD.name }],
			},
		},
		{
			// Day 15: half done and a playtest with strangers ahead — where the advice and the focus used to disagree.
			id: "midway-half",
			label: say(
				language,
				"Day 15, half done, a playtest ahead",
				"День 15, половина сделана, впереди плейтест",
			),
			input: {
				...variant2,
				tasks: [
					jump,
					levelWith("Partly", TEXT.halfSeen),
					openTask(build),
					openTask(players),
				],
				devlogs: [TEXT.halfDevlog],
				artifacts: [LEVEL_BUILD],
			},
		},
		{
			// Day 22, a better sprint 3 than the real one: level 1 is in.
			id: "on-course",
			label: say(language, "Day 22, back on course", "День 22, снова на курсе"),
			input: {
				...cp.sprintReview(3, after1),
				tasks: [
					jump,
					levelWith("Matches", TEXT.levelSeen),
					{
						...openTask(build),
						evidence: [
							{
								...LEVEL_BUILD,
								seen: { match: "Matches" as const, note: TEXT.levelSeen },
							},
						],
					},
					openTask(players),
				],
				devlogs: [TEXT.onCourseDevlog],
				artifacts: [LEVEL_BUILD],
			},
		},
		{
			// Day 29 as it happened: level 1 and a playtest with two friends; the verdict follows.
			id: "final",
			label: say(
				language,
				"The final review, before the verdict",
				"Итоговый разбор, перед вердиктом",
			),
			input: cp.sprintReview(4, {
				journal: [],
				focus: TEXT.focusAfter3,
				lastDirection: null,
			}),
		},
	];
};
