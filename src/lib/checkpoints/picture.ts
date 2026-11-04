import {
	type CuratorLens,
	type Direction,
	SPRINTS_PER_CHECKPOINT,
} from "@/config/checkpoint";
import { hoursSpan } from "@/lib/checkpoints/capacity";
import { utcStartOfDay } from "@/lib/checkpoints/days";
import { dateOfDay } from "@/lib/checkpoints/plan";
import { sprintDayRange } from "@/lib/checkpoints/sprints";
import type { SprintDirection } from "@/types/checkpoints";

/**
 * The project as it stood at one sprint boundary of a checkpoint (GDHUB-133),
 * kept in the journal as a `Snapshot` entry. Ids, names and counters only: what
 * an artifact or a devlog's media shows lives in its own read, joined by id.
 * Counters are totals, so a period's numbers are the difference of two pictures.
 */
export type CheckpointPicture = {
	version: 1;
	/** The UTC day the picture stands for. */
	at: string;
	/** 0 is day 1, 1–4 the last day of each sprint. */
	point: number;
	project: {
		stage: string;
		description: string | null;
		genre: string | null;
		platform: string | null;
		setting: string | null;
		visualStyle: string | null;
		/** By platform name: store pages, socials, concept, GDD, pitch deck, video. */
		links: Record<string, string>;
	};
	team: {
		members: {
			id: string;
			name: string;
			role: string;
			level: string | null;
			hours: { from: number; to: number } | null;
		}[];
		invitations: { id: string; role: string; status: string }[];
		vacancies: {
			id: string;
			title: string;
			status: string;
			applicants: number;
		}[];
	};
	work: {
		artifacts: { id: string; type: string; name: string | null }[];
		devlogs: { id: string; number: number | null }[];
	};
	signals: {
		projectViews: number;
		devlogViews: number;
		applause: number;
	};
	plan: {
		/** What the author listed on day 1 as already there, with its artifacts. */
		inputs: { id: string; text: string; artifactIds: string[] }[];
		tasks: { id: string; text: string; cut: boolean; proved: boolean }[];
	};
};

/** What changed between two pictures, line by line, under the lens that reads it. */
export type PictureDifference = Record<CuratorLens, string[]>;

const byId = <T extends { id: string }>(rows: T[]) =>
	new Map(rows.map((row) => [row.id, row]));

const hours = (range: { from: number; to: number } | null) =>
	range ? hoursSpan(range) : "not stated";

const quoted = (name: string | null) => (name ? ` "${name}"` : "");

const PROJECT_FIELDS = [
	"description",
	"genre",
	"platform",
	"setting",
	"visualStyle",
] as const;

const development = (before: CheckpointPicture, after: CheckpointPicture) => {
	const artifacts = byId(before.work.artifacts);
	const kept = byId(after.work.artifacts);
	const devlogs = byId(before.work.devlogs);
	return [
		...after.work.artifacts
			.filter((row) => !artifacts.has(row.id))
			.map((row) => `+ artifact${quoted(row.name)} (${row.type})`),
		...before.work.artifacts
			.filter((row) => !kept.has(row.id))
			.map((row) => `− artifact${quoted(row.name)} removed`),
		...after.work.devlogs
			.filter((row) => !devlogs.has(row.id))
			.map((row) => `+ devlog${row.number ? ` #${row.number}` : ""}`),
	];
};

const team = (before: CheckpointPicture, after: CheckpointPicture) => {
	const was = byId(before.team.members);
	const now = byId(after.team.members);
	const lines: string[] = [];

	for (const member of after.team.members) {
		const old = was.get(member.id);
		if (!old) {
			lines.push(
				`${member.name} joined as ${member.role}, ${member.hours ? `${hours(member.hours)} h/week` : "hours not stated"}`,
			);
			continue;
		}
		if (old.role !== member.role)
			lines.push(`${member.name}: role ${old.role} → ${member.role}`);
		if (old.level !== member.level)
			lines.push(
				`${member.name}: level ${old.level ?? "none"} → ${member.level ?? "none"}`,
			);
		if (hours(old.hours) !== hours(member.hours))
			lines.push(
				`${member.name}: hours ${hours(old.hours)} → ${hours(member.hours)} h/week`,
			);
	}
	for (const member of before.team.members)
		if (!now.has(member.id)) lines.push(`${member.name} (${member.role}) left`);

	const invited = byId(before.team.invitations);
	for (const invitation of after.team.invitations) {
		const old = invited.get(invitation.id);
		if (!old) lines.push(`invited a ${invitation.role} (${invitation.status})`);
		else if (old.status !== invitation.status)
			lines.push(
				`invitation for ${invitation.role}: ${old.status} → ${invitation.status}`,
			);
	}

	const posted = byId(before.team.vacancies);
	const open = byId(after.team.vacancies);
	for (const vacancy of after.team.vacancies) {
		const old = posted.get(vacancy.id);
		if (!old)
			lines.push(
				`vacancy "${vacancy.title}" ${vacancy.status}, ${vacancy.applicants} applied`,
			);
		else if (old.status !== vacancy.status || old.title !== vacancy.title)
			lines.push(
				`vacancy "${old.title}" ${old.status} → "${vacancy.title}" ${vacancy.status}`,
			);
		else if (old.applicants !== vacancy.applicants)
			lines.push(
				`vacancy "${vacancy.title}": +${vacancy.applicants - old.applicants} applied`,
			);
	}
	for (const vacancy of before.team.vacancies)
		if (!open.has(vacancy.id)) lines.push(`vacancy "${vacancy.title}" removed`);

	return lines;
};

const delta = (label: string, before: number, after: number) =>
	after === before
		? []
		: [`${label} ${after > before ? "+" : ""}${after - before}`];

const signals = (before: CheckpointPicture, after: CheckpointPicture) => [
	...delta(
		"project views",
		before.signals.projectViews,
		after.signals.projectViews,
	),
	...delta(
		"devlog views",
		before.signals.devlogViews,
		after.signals.devlogViews,
	),
	...delta("applause", before.signals.applause, after.signals.applause),
];

const links = (before: CheckpointPicture, after: CheckpointPicture) => {
	const lines: string[] = [];
	const was = before.project.links;
	const now = after.project.links;
	for (const [platform, link] of Object.entries(now)) {
		if (!was[platform]) lines.push(`${platform} link added: ${link}`);
		else if (was[platform] !== link)
			lines.push(`${platform} link changed: ${link}`);
	}
	for (const platform of Object.keys(was))
		if (!now[platform]) lines.push(`${platform} link removed`);
	return lines;
};

/** What the author changed in the project and its tasks; what is still open is not a change. */
const projectChanges = (
	before: CheckpointPicture,
	after: CheckpointPicture,
) => {
	const lines: string[] = [];
	if (before.project.stage !== after.project.stage)
		lines.push(`stage ${before.project.stage} → ${after.project.stage}`);
	for (const field of PROJECT_FIELDS) {
		if (before.project[field] === after.project[field]) continue;
		lines.push(
			field === "description"
				? "description rewritten"
				: `${field === "visualStyle" ? "visual style" : field} ${before.project[field] ?? "none"} → ${after.project[field] ?? "none"}`,
		);
	}

	const tasks = byId(before.plan.tasks);
	for (const task of after.plan.tasks) {
		const old = tasks.get(task.id);
		if (!old) lines.push(`task added: "${task.text}"`);
		else {
			if (!old.cut && task.cut) lines.push(`task cut: "${task.text}"`);
			if (old.text !== task.text)
				lines.push(`task reworded: "${old.text}" → "${task.text}"`);
			if (!old.proved && task.proved) lines.push(`task proved: "${task.text}"`);
		}
	}
	return lines;
};

const stillOpen = (after: CheckpointPicture) => {
	const open = after.plan.tasks.filter((task) => !task.cut && !task.proved);
	return open.length
		? [`still open: ${open.map((task) => `"${task.text}"`).join(", ")}`]
		: [];
};

export const pictureDifference = (
	before: CheckpointPicture,
	after: CheckpointPicture,
): PictureDifference => ({
	development: development(before, after),
	team: team(before, after),
	marketing: [...signals(before, after), ...links(before, after)],
	management: [...projectChanges(before, after), ...stillOpen(after)],
});

/**
 * Nothing was done between the pictures: no artifact, no devlog, nothing changed
 * in the team, the project or the tasks. Views and applause come by themselves
 * and an open task is not a change, so neither counts.
 */
export const isIdle = (before: CheckpointPicture, after: CheckpointPicture) =>
	!development(before, after).length &&
	!team(before, after).length &&
	!links(before, after).length &&
	!projectChanges(before, after).length;

const LENS_TITLE: Record<CuratorLens, string> = {
	development: "Development",
	team: "Team",
	marketing: "Marketing",
	management: "Project management",
};

/** The difference as the model reads it: one block per lens, nothing for a lens with no change. */
export const renderDifference = (
	difference: PictureDifference,
	since: string,
) => {
	const blocks = (Object.keys(LENS_TITLE) as CuratorLens[]).flatMap((lens) =>
		difference[lens].length
			? [
					`${LENS_TITLE[lens]}:\n${difference[lens].map((line) => `- ${line}`).join("\n")}`,
				]
			: [],
	);
	return blocks.length
		? `What changed on the project since ${since}:\n${blocks.join("\n")}`
		: `Nothing changed on the project since ${since}.`;
};

/**
 * The pictures whose moment has come by `now`: 0 once day 1 has begun, sprint N
 * once its last day is over — the night run that writes sprint N's review.
 */
export const duePicturePoints = (startedAt: Date, now: Date) => {
	const today = utcStartOfDay(now);
	if (today < utcStartOfDay(startedAt)) return [];
	return [
		0,
		...Array.from(
			{ length: SPRINTS_PER_CHECKPOINT },
			(_, index) => index + 1,
		).filter(
			(sprint) =>
				today >= dateOfDay(startedAt, sprintDayRange(sprint).lastDay + 1),
		),
	];
};

/**
 * The direction as written: a sprint with nothing in its difference is idle on
 * both goals whatever the model said, and one with something in it never is.
 */
export const settleDirection = <
	D extends { goal: { value: Direction }; stage: { value: Direction } },
>(
	direction: D,
	idle: boolean,
): D => {
	const settle = (value: Direction): Direction =>
		idle ? "idle" : value === "idle" ? "stalled" : value;
	return {
		...direction,
		goal: { ...direction.goal, value: settle(direction.goal.value) },
		stage: { ...direction.stage, value: settle(direction.stage.value) },
	};
};

/** What changed between two pictures, as the model reads it, and whether nothing was done. */
export const changeBetween = (
	before: CheckpointPicture,
	after: CheckpointPicture,
	since: string,
) => ({
	difference: renderDifference(pictureDifference(before, after), since),
	idle: isIdle(before, after),
});

/**
 * A sprint's direction as it counts: an AI review's always, a human call's
 * once the curator confirmed it — a preset the curator never confirmed is not theirs.
 */
export const directionOf = (content: unknown) => {
	const notes = content as {
		notes?: { direction?: SprintDirection };
		direction?: SprintDirection;
	} | null;
	const direction = (notes?.notes ?? notes)?.direction;
	return direction && direction.confirmedAt !== null ? direction : undefined;
};

/** Each sprint's direction, sprint 1 first; session 1 is day 1, before any sprint. */
export const sprintDirections = (
	sessions: { index: number; content: unknown }[],
) =>
	sessions
		.filter((session) => session.index > 1)
		.sort((a, b) => a.index - b.index)
		.flatMap((session) => {
			const direction = directionOf(session.content);
			return direction ? [{ sprint: session.index - 1, direction }] : [];
		});
