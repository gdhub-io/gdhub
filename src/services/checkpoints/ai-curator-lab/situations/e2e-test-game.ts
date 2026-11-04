import {
	CHECKPOINT_DAYS,
	CURATOR_STAGE_BRIEFS,
	LEAD_IN_DAYS,
	SPRINT_DAYS,
	SPRINTS_PER_CHECKPOINT,
} from "@/config/checkpoint";
import {
	type ActivityKind,
	activityLine,
	activityText,
} from "@/lib/checkpoints/activity-text";
import { teamCapacity } from "@/lib/checkpoints/capacity";
import { lensWeights } from "@/lib/checkpoints/lenses";
import {
	type CheckpointPicture,
	changeBetween,
} from "@/lib/checkpoints/picture";
import { dateOfDay, reviewOnLabel } from "@/lib/checkpoints/plan";
import { midwayAdviceInput } from "@/services/checkpoints/ai-review";
import { toCuratorTask } from "@/services/checkpoints/call-notes";
import type { JournalEntry } from "@/types/checkpoint-curator";
import type { SprintDirection } from "@/types/checkpoints";
import {
	E2E_PROJECT,
	E2E_ROAD,
	FOUNDERS,
	type RoadArtifact,
	type RoadCheckpoint,
	type RoadMember,
	type RoadProject,
	type TeamChange,
} from "./e2e-road";

/**
 * E2E Test Game (GDHUB-133, GDHUB-140): a classic 2D side-scrolling platformer —
 * run, jump, stomp, collect, reach the flag. A gnome saves Christmas: he
 * collects candies, and the villain has kidnapped the Snow Maiden.
 *
 * Its road is in `e2e-road.ts`. This file reads it the way production reads a
 * project — the team, the activity, the public devlogs, the pictures — at any
 * moment of any checkpoint, so each call sees only what existed then, and
 * builds every call's input from those facts in one place.
 */

export { BO, DAN, E2E_PROJECT, E2E_ROAD, LINKS } from "./e2e-road";

/** The stage goals of the Default workflow template, as its seed stands (GDHUB-97). */
const STAGE_GOALS: Record<string, string> = {
	Ideation:
		"One idea is chosen and defended: what the game is, who it is for and why this idea over the others.",
	Concepting:
		"A concept the team can build from: core loop, audience, scope and look are settled, and the riskiest open questions are named.",
	Prototyping:
		"The concept's riskiest questions are answered with something playable or visible: the core works and the style is chosen.",
	"Preparing a demo version":
		"A short slice of the game at near-final quality is public for anyone to play, and the store page is live.",
	"Taking and analyzing metrics":
		"What players do with the demo is measured and turned into decisions: what to fix, cut or build on.",
	"Preparing a release version": "The full game is finished and released.",
};

/** When a call reads a checkpoint: before it, after sprints 1–3, at day 15, at the end. */
export type Moment = "start" | 1 | 2 | 3 | "midway" | "end";

/** The moment a sprint's review reads: the last one reads the whole run. */
export const momentOf = (sprint: number): Moment =>
	sprint === SPRINTS_PER_CHECKPOINT ? "end" : (sprint as 1 | 2 | 3);

const iso = (date: Date) => date.toISOString().slice(0, 10);

const dayOf = (checkpoint: RoadCheckpoint, day: number) =>
	iso(dateOfDay(checkpoint.start, day));

/** The last day of sprint `k`; sprint 0 ends the day before day 1. */
const sprintEnd = (checkpoint: RoadCheckpoint, k: number) =>
	dayOf(checkpoint, SPRINT_DAYS * k);

const periodOf = (checkpoint: RoadCheckpoint, moment: Moment) => {
	if (moment === "start")
		return {
			from: dayOf(checkpoint, 1 - LEAD_IN_DAYS),
			to: checkpoint.start,
			weeks: 0,
		};
	if (moment === "midway")
		return { from: checkpoint.start, to: sprintEnd(checkpoint, 2), weeks: 2 };
	if (moment === "end")
		return {
			from: checkpoint.start,
			to: dayOf(checkpoint, CHECKPOINT_DAYS),
			weeks: SPRINTS_PER_CHECKPOINT,
		};
	return {
		from: dayOf(checkpoint, SPRINT_DAYS * (moment - 1) + 1),
		to: sprintEnd(checkpoint, moment),
		weeks: moment,
	};
};

const ARTIFACTS = E2E_ROAD.flatMap((checkpoint) =>
	checkpoint.sprints.flatMap((sprint) => sprint.artifacts),
);
const DEVLOGS = E2E_ROAD.flatMap((checkpoint) =>
	checkpoint.sprints.flatMap((sprint) => sprint.devlogs),
);
const CHANGES = E2E_ROAD.flatMap((checkpoint) =>
	checkpoint.sprints.flatMap((sprint) => sprint.team ?? []),
).sort((a, b) => a.on.localeCompare(b.on));

type TeamMember = RoadMember & { joinedOn: string | null };
type Vacancy = {
	id: string;
	title: string;
	postedOn: string;
	applicants: number;
};

const apply = (
	change: TeamChange,
	members: Map<string, TeamMember>,
	vacancies: Map<string, Vacancy>,
) => {
	if ("joins" in change)
		members.set(change.joins.id, { ...change.joins, joinedOn: change.on });
	else if ("leaves" in change) members.delete(change.leaves);
	else if ("hours" in change) {
		const member = members.get(change.hours);
		if (member) members.set(member.id, { ...member, hours: change.to });
	} else if ("opens" in change)
		vacancies.set(change.opens.id, {
			...change.opens,
			postedOn: change.on,
			applicants: change.applied,
		});
	else if ("vacancy" in change) {
		const vacancy = vacancies.get(change.vacancy);
		if (vacancy)
			vacancies.set(vacancy.id, { ...vacancy, applicants: change.applicants });
	} else vacancies.delete(change.closes);
};

/** The team and its open positions at the end of `date`. */
const teamOn = (date: string) => {
	const members = new Map<string, TeamMember>(
		FOUNDERS.map((member) => [member.id, { ...member, joinedOn: null }]),
	);
	const vacancies = new Map<string, Vacancy>();
	for (const change of CHANGES) {
		if (change.on > date) break;
		apply(change, members, vacancies);
	}
	return { members: [...members.values()], vacancies: [...vacancies.values()] };
};

/** The project page and its links at the end of `date`; a sprint's page changes land on its last day. */
const projectOn = (date: string) => {
	const project: RoadProject = {
		description: null,
		genre: null,
		platform: null,
		setting: null,
		visualStyle: null,
	};
	const links: Record<string, string> = {};
	for (const checkpoint of E2E_ROAD)
		checkpoint.sprints.forEach((sprint, index) => {
			if (sprintEnd(checkpoint, index + 1) > date) return;
			Object.assign(project, sprint.project);
			Object.assign(links, sprint.links);
		});
	return { project, links };
};

const JOINED = CHANGES.flatMap((change) =>
	"joins" in change ? [change.joins] : [],
);
const OPENED = CHANGES.flatMap((change) =>
	"opens" in change ? [change.opens] : [],
);

type Event = {
	on: string;
	id: string;
	kind: ActivityKind;
	actor: string;
	subject: string;
};

const eventOf = (change: TeamChange): Event[] => {
	if ("joins" in change)
		return [
			{
				on: change.on,
				id: change.joins.id,
				kind: "joined",
				actor: change.joins.name,
				subject: change.joins.role,
			},
		];
	if ("leaves" in change) {
		const member = [...FOUNDERS, ...JOINED].find(
			(each) => each.id === change.leaves,
		);
		return member
			? [
					{
						on: change.on,
						id: member.id,
						kind: "left",
						actor: member.name,
						subject: member.role,
					},
				]
			: [];
	}
	if ("opens" in change)
		return [
			{
				on: change.on,
				id: change.opens.id,
				kind: "vacancyOpened",
				actor: "",
				subject: change.opens.title,
			},
		];
	if ("closes" in change)
		return [
			{
				on: change.on,
				id: change.closes,
				kind: "vacancyClosed",
				actor: "",
				subject:
					OPENED.find((each) => each.id === change.closes)?.title ??
					change.closes,
			},
		];
	return [];
};

/** Every activity event on the road, as the feed has it, oldest first. */
const EVENTS: Event[] = [
	...ARTIFACTS.map((artifact) => ({
		on: artifact.on,
		id: artifact.id,
		kind: "artifact" as const,
		actor: artifact.by,
		subject: artifact.name,
	})),
	...CHANGES.flatMap(eventOf),
].sort((a, b) => a.on.localeCompare(b.on));

/** A task with no evidence yet, as a situation varies it. */
export const openTask = (task: { id: string; text: string }) => ({
	id: task.id,
	text: task.text,
	cut: false,
	firstWording: null,
	evidence: [] as {
		type: string;
		name: string | null;
		seen: {
			match: "Matches" | "Partly" | "DoesNotMatch";
			note: string | null;
		} | null;
	}[],
});

/** The letters before this review, the focus it asked for and where the last sprint went. */
export type ReviewSoFar = {
	journal: JournalEntry[];
	focus: string[];
	lastDirection: SprintDirection | null;
};

const NOTHING_SO_FAR: ReviewSoFar = {
	journal: [],
	focus: [],
	lastDirection: null,
};

/** One checkpoint of the road, read at its moments, with every call's input built from it. */
export const e2eCheckpoint = (number: number) => {
	const checkpoint = E2E_ROAD.find((each) => each.number === number);
	if (!checkpoint) throw new Error(`E2E Test Game has no checkpoint ${number}`);
	const previous = E2E_ROAD.find((each) => each.number === number - 1);

	const workflow = (moment: Moment) => {
		const { to } = periodOf(checkpoint, moment);
		return {
			projectGoal: E2E_PROJECT.projectGoal,
			currentStage: checkpoint.stage,
			nextStage: checkpoint.nextStage,
			description: CURATOR_STAGE_BRIEFS[checkpoint.stage] ?? null,
			goal: STAGE_GOALS[checkpoint.stage] ?? null,
			lenses: lensWeights(checkpoint.stage),
			requiredTasks: checkpoint.required.map((task) => ({
				name: task.name,
				done: task.doneOn !== null && task.doneOn <= to,
			})),
		};
	};

	/** The team as `curatorTeam` builds it: the weeks already behind only. */
	const team = (moment: Moment) => {
		const { to, weeks } = periodOf(checkpoint, moment);
		const { members, vacancies } = teamOn(to);
		return {
			...teamCapacity(
				members.map((member) => ({
					timeForWork: [member.hours.from, member.hours.to],
				})),
			),
			people: members.map((member) => ({
				name: member.name,
				role: member.role,
				level: member.level as string | null,
				hoursPerWeek: member.hours as { from: number; to: number } | null,
				weeks: checkpoint.sprints
					.slice(0, weeks)
					.map(
						(sprint, index) =>
							!(sprint.missed ?? []).includes(member.id) &&
							(member.joinedOn ?? "") <= sprintEnd(checkpoint, index + 1),
					),
				joinedOn:
					member.joinedOn && member.joinedOn >= checkpoint.start
						? member.joinedOn
						: null,
			})),
			openings: vacancies.map((vacancy) => ({
				role: vacancy.title,
				postedOn: vacancy.postedOn,
				applied: vacancy.applicants,
			})),
		};
	};

	/** What happened in the moment's period, as `projectPicture` writes it; `without` drops artifacts never added. */
	const activity = (moment: Moment, without: string[] = []) => {
		const { from, to } = periodOf(checkpoint, moment);
		const lines = EVENTS.filter(
			(event) =>
				event.on >= from && event.on <= to && !without.includes(event.id),
		).map((event) =>
			activityLine(event.on, event.kind, event.actor, event.subject),
		);
		return activityText(lines, from, to, moment === "start");
	};

	/** The public devlogs of the period, newest first, and the project's links, as `curatorMarketing` reads them. */
	const marketing = (moment: Moment) => {
		const { from, to } = periodOf(checkpoint, moment);
		return {
			devlogs: DEVLOGS.filter((post) => post.on >= from && post.on <= to)
				.map((post) => ({
					title: post.title,
					publishedAt: post.on,
					applause: post.applause,
					views: post.views,
				}))
				.reverse(),
			links: Object.entries(projectOn(to).links).map(
				([platform, link]) => `${platform}: ${link}`,
			),
		};
	};

	/** The four facts every call reads at a moment, built once as `checkpointFacts` builds them. */
	const facts = (moment: Moment) => ({
		workflow: workflow(moment),
		team: team(moment),
		picture: activity(moment),
		marketing: marketing(moment),
	});

	/** The devlogs written inside the checkpoint up to the moment, for the report. */
	const devlogs = (moment: Moment = "end") => {
		const { to } = periodOf(checkpoint, moment);
		return DEVLOGS.filter(
			(post) => post.on >= checkpoint.start && post.on <= to,
		).map((post) => ({ publishedAt: post.on, content: post.text }));
	};

	/** What one sprint showed, as a review receives it. */
	const sprint = (k: number) => ({
		devlogs: checkpoint.sprints[k - 1].devlogs.map((post) => post.text),
		artifacts: checkpoint.sprints[k - 1].artifacts.map(({ type, name }) => ({
			type,
			name,
		})),
	});

	const proofs = (upTo: number): RoadArtifact[] =>
		checkpoint.sprints
			.slice(0, upTo)
			.flatMap((each) => each.artifacts)
			.filter((artifact) => artifact.proves);

	/** The goal card after sprint `upTo` (0 is day 1), with what the evidence check saw in each artifact. */
	const items = (upTo = SPRINTS_PER_CHECKPOINT) => [
		...checkpoint.inputs.map((input) => ({
			...input,
			kind: "Input" as const,
			originalText: null,
			cut: false,
			addedAt: null,
			evidence: [],
		})),
		...checkpoint.tasks.map((task) => ({
			...task,
			kind: "Outcome" as const,
			originalText: null,
			cut: false,
			addedAt: null,
			evidence: proofs(upTo)
				.filter((artifact) => artifact.proves?.task === task.id)
				.map((artifact) => ({
					match: artifact.proves?.seen.match ?? null,
					matchNote: artifact.proves?.seen.note ?? null,
					artifact: {
						type: artifact.type,
						name: artifact.name,
						description: null,
						link: artifact.link,
						checkStatus: "Readable" as const,
						checkNote: null,
					},
				})),
		})),
	];

	/** The tasks as a review reads them after sprint `k`. */
	const tasks = (k: number) =>
		items(k)
			.filter((item) => item.kind === "Outcome")
			.map(toCuratorTask);

	/** The project at a boundary: 0 is day 1, then the last day of each sprint. */
	const picture = (point: number): CheckpointPicture => {
		// Day 1's picture is the project before anything of the checkpoint was done.
		const upTo = sprintEnd(checkpoint, point);
		const { members, vacancies } = teamOn(upTo);
		const { project, links } = projectOn(upTo);
		const posts = DEVLOGS.filter((post) => post.on <= upTo);
		const devlogViews = posts.reduce((sum, post) => sum + post.views, 0);
		return {
			version: 1,
			at: point === 0 ? checkpoint.start : upTo,
			point,
			project: { stage: checkpoint.stage, ...project, links },
			team: {
				members: members.map(({ id, name, role, level, hours }) => ({
					id,
					name,
					role,
					level,
					hours,
				})),
				invitations: [],
				vacancies: vacancies.map((vacancy) => ({
					id: vacancy.id,
					title: vacancy.title,
					status: "Published",
					applicants: vacancy.applicants,
				})),
			},
			work: {
				artifacts: ARTIFACTS.filter((artifact) => artifact.on <= upTo).map(
					({ id, type, name }) => ({ id, type, name }),
				),
				devlogs: posts.map((post, index) => ({
					id: post.id,
					number: index + 1,
				})),
			},
			signals: {
				projectViews: Math.round(devlogViews * 1.6),
				devlogViews,
				applause: posts.reduce((sum, post) => sum + post.applause, 0),
			},
			plan: {
				inputs: checkpoint.inputs.map((input) => ({
					...input,
					artifactIds: [],
				})),
				tasks: checkpoint.tasks.map((task) => ({
					...task,
					cut: false,
					proved: ARTIFACTS.some(
						(artifact) =>
							artifact.on <= upTo &&
							artifact.proves?.task === task.id &&
							artifact.proves.seen.match === "Matches",
					),
				})),
			},
		};
	};

	// Every call's input, as production builds it at that moment.

	/** Day 1, right after payment: the goal as paid for, no tasks yet. */
	const goalCheck = () => ({
		...facts("start"),
		card: { goal: checkpoint.goal, inputs: checkpoint.inputs, outcomes: [] },
		project: {
			name: E2E_PROJECT.name,
			pitch: E2E_PROJECT.pitch,
			genre: E2E_PROJECT.genre,
		},
		author: E2E_PROJECT.author,
		// How the checkpoint before ended; `because` stands in for its verdict note.
		previous: previous
			? { verdict: previous.verdict, note: previous.because }
			: null,
	});

	/** Day 1: the author's tasks, sent for the one check. */
	const tasksCheck = () => ({
		...facts("start"),
		goal: checkpoint.goal,
		tasks: tasks(0),
		moment: "start" as const,
		review: null,
	});

	/** Day 1, the plan approved. */
	const planLetter = () => ({
		goal: checkpoint.goal,
		tasks: checkpoint.tasks.map((task) => task.text),
		reviewOn: reviewOnLabel(checkpoint.start),
	});

	/** One sprint's review, reading the pictures either side of it and the review before. */
	const sprintReview = (k: number, before: ReviewSoFar = NOTHING_SO_FAR) => ({
		...facts(momentOf(k)),
		goal: checkpoint.goal,
		journal: [...before.journal],
		sprint: k,
		tasks: tasks(k),
		...sprint(k),
		media: [] as string[],
		focusLastReview: before.focus,
		final: k === SPRINTS_PER_CHECKPOINT,
		...changeBetween(picture(k - 1), picture(k), `the start of sprint ${k}`),
		lastDirection: before.lastDirection,
	});

	/** Day 15: the last change to the tasks, read from the sprint 2 review. */
	const planAdvice = (review: string) =>
		midwayAdviceInput({ ...sprintReview(2), character: null }, review);

	/** Day 29, as the checkpoint's rows hold it. */
	const report = () => ({
		...facts("end"),
		goal: checkpoint.goal,
		revision: null,
		items: items(),
		devlogs: devlogs(),
	});

	return {
		checkpoint,
		day: (n: number) => dayOf(checkpoint, n),
		facts,
		activity,
		devlogs,
		sprint,
		tasks,
		items,
		picture,
		goalCheck,
		tasksCheck,
		planLetter,
		sprintReview,
		planAdvice,
		report,
	};
};

/**
 * Call 2 of a human curator's checkpoint 3, reviewing sprint 1. The jump and
 * the team's hours are discussed; the audience never comes up, so the
 * marketing lens must come back empty.
 */
export const E2E_CALL_TRANSCRIPT = `So the jump build is up on itch, I played it this morning. The coyote time feels right, I could jump a beat after the edge and it still worked. The buffer too.
Good. That was the first task, so that one is done, the build is the proof.
What about the level? Nothing yet, we only have the gnome on a flat floor.
Right. Bo, how much time do you have the next weeks?
Less, honestly. Maybe five to ten hours a week, I have another contract.
Then the level has to come from Ana, and the art for it should be tiles you can reuse. Let's agree that by the next call there is a greybox of level 1 from the start to the flag.
And the candies and enemies can wait, the path to the flag first.
Agreed. The jump moves us toward the goal; the level is where we stand still so far.`;
