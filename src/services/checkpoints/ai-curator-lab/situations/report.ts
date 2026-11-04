import {
	type LabLanguage,
	type reportInput,
	type Situation,
	say,
} from "../schemas";
import { e2eCheckpoint, LINKS } from "./e2e-test-game";

type Item = Situation<typeof reportInput>["input"]["items"][number];
type Piece = NonNullable<Item["evidence"]>[number];

/** Day 29 of checkpoint 3: what the evidence came to, as the earlier checks left it. */
const TEXT = {
	fiveSeen: "Notes from five players outside the team; four reached the flag.",
	partly: "Notes from three players, not five.",
	other: "A Wikipedia page about the Godot engine, not playtest notes.",
	cut: "The playtest moves to the next checkpoint; level 1 comes first.",
	refTasks: [
		"A public repository of the Godot demo projects the game builds on",
		"An animated reference video for the art style",
		"A reference article on what playtesting is, for the team to read",
	],
	refSeen: [
		"The public godotengine/godot-demo-projects repository.",
		"A short animated film used as an art reference.",
		"A Wikipedia article explaining playtesting.",
	],
	warned: [
		"I've checked the tasks against the goal: they collect references, but none makes the jump or the level playable. Add a task that builds level 1 to the flag before you approve.",
		"The repository is in, but nothing playable yet. Next, build the jump and attach a build.",
		"Halfway, still nothing to play. Make this the last change: drop the article and publish a build of level 1.",
		"The references are complete; the game is still not playable. Put level 1 on itch.io before the end.",
	],
	ownRoute: [
		"Book the playtest with five players at a meetup before anything else.",
	],
	commentsSeen:
		"Comments under the itch.io build from five players outside the team; each says where they fell and whether they reached the flag.",
	commentsDevlog:
		"Week 4: no meetup this month, so we posted level 1 on the itch.io page and asked for comments. Five strangers played it and wrote where they fell.",
	privateDevlog:
		"Week 4: level 1 is done from the start to the flag. The build is private on itch.io until the playtest — the link is on the task.",
};

const artifact = (
	type: string,
	name: string,
	link: string,
	over: Partial<Piece["artifact"]> = {},
): Piece["artifact"] => ({
	type,
	name,
	description: null,
	link,
	checkStatus: "Readable",
	...over,
});

const seen = (
	piece: Piece["artifact"],
	match?: Piece["match"],
	matchNote?: string,
): Piece => ({ artifact: piece, match, matchNote });

export const reportSituations = (
	language: LabLanguage,
): Situation<typeof reportInput>[] => {
	const cp = e2eCheckpoint(3);
	const report = cp.report();
	const base = { ...report, items: report.items as Item[] };
	const [jump, level, , players] = cp.checkpoint.tasks;
	const outcome = (
		task: { id: string; text: string },
		...evidence: Piece[]
	): Item => ({
		...task,
		kind: "Outcome",
		evidence,
	});
	const replacing = (item: Item) => ({
		...base,
		items: base.items.map((each) => (each.id === item.id ? item : each)),
	});
	const notes = artifact(
		"Document",
		"Playtest notes",
		`${LINKS.docs}/playtest`,
	);
	const allDelivered = replacing(
		outcome(players, seen(notes, "Matches", TEXT.fiveSeen)),
	);
	const devlogs = base.devlogs;
	// No notes were ever attached: the activity never shows them added.
	const withoutNotes = cp.activity("end", ["a14"]);

	return [
		{
			id: "as-it-happened",
			label: say(
				language,
				"As it happened: two friends, not five strangers",
				"Как было: двое друзей, а не пятеро чужих",
			),
			input: base,
		},
		{
			id: "all-delivered",
			label: say(language, "All delivered", "Всё сдано"),
			input: allDelivered,
		},
		{
			id: "login-devlog",
			label: say(
				language,
				"Behind a login, a devlog describes it",
				"За логином, девлог описывает",
			),
			input: {
				...allDelivered,
				items: allDelivered.items.map((each) =>
					each.id === level.id
						? outcome(
								level,
								seen(
									artifact(
										"ExecutableBuild",
										"E2E Test Game 0.3 · web",
										LINKS.itch,
										{
											checkStatus: "Unreachable",
											checkNote: "needsLogin",
										},
									),
								),
							)
						: each,
				),
				devlogs: devlogs.map((post) =>
					post.publishedAt === "2026-11-27"
						? { ...post, content: TEXT.privateDevlog }
						: post,
				),
			},
		},
		{
			id: "partly",
			label: say(language, "Shown in part", "Показано частично"),
			input: replacing(outcome(players, seen(notes, "Partly", TEXT.partly))),
		},
		{
			id: "does-not-match",
			label: say(language, "Not about the task", "Не про задачу"),
			input: replacing(
				outcome(players, seen(notes, "DoesNotMatch", TEXT.other)),
			),
		},
		{
			id: "broken",
			label: say(language, "Link doesn't open", "Ссылка не открывается"),
			input: {
				...allDelivered,
				items: allDelivered.items.map((each) =>
					each.id === jump.id
						? outcome(
								jump,
								seen(
									artifact(
										"ExecutableBuild",
										"Jump test 0.1 · web",
										LINKS.jump,
										{
											checkStatus: "Unreachable",
											checkNote: "notFound",
										},
									),
								),
							)
						: each,
				),
			},
		},
		{
			// The playtest ran — the devlog says so — but no notes were attached.
			id: "nothing",
			label: say(language, "Nothing attached", "Ничего не приложено"),
			input: { ...replacing(outcome(players)), picture: withoutNotes },
		},
		{
			// Every task proven, none of them the goal, after four letters saying so.
			id: "plan-off-goal",
			label: say(
				language,
				"All tasks proven, the goal not shown, advice not taken",
				"Все задачи сданы, цели нет, советы не взяли",
			),
			input: {
				...base,
				journal: TEXT.warned.map((text, index) => ({
					day: 1 + index * 7,
					text,
				})),
				items: [
					...base.items.filter((each) => each.kind === "Input"),
					...TEXT.refTasks.map((text, index) =>
						outcome(
							{ id: `r${index + 1}`, text },
							seen(
								artifact("Other", text, `https://example.com/ref-${index + 1}`),
								"Matches",
								TEXT.refSeen[index],
							),
						),
					),
				],
				devlogs: [],
				picture: cp.activity("end", ["a11", "a13", "a14"]),
			},
		},
		{
			// The team skipped the advised meetup and asked for comments on itch.io — and the goal is shown.
			id: "own-route",
			label: say(
				language,
				"The team's own route reaches the goal",
				"Свой путь команды дошёл до цели",
			),
			input: {
				...replacing(
					outcome(
						players,
						seen(
							artifact("Other", "itch.io comments", `${LINKS.itch}/comments`),
							"Matches",
							TEXT.commentsSeen,
						),
					),
				),
				journal: TEXT.ownRoute.map((text) => ({ day: 15, text })),
				devlogs: [
					...devlogs.filter((post) => post.publishedAt !== "2026-11-28"),
					{ publishedAt: "2026-11-28", content: TEXT.commentsDevlog },
				],
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
				...replacing({ ...outcome(players), cut: true }),
				revision: { revisedAt: "2026-11-16", note: TEXT.cut },
				devlogs: devlogs.filter((post) => post.publishedAt !== "2026-11-28"),
				picture: withoutNotes,
			},
		},
	];
};
