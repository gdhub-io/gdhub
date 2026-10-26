import { hoursSpan, weeklyRange } from "@/lib/checkpoint-capacity";
import { dueDateFrom, MS_PER_DAY } from "@/lib/checkpoint-days";
import { getProjectActivity } from "@/repositories/project-activity.repository";
import { CONFIRMED_MEMBERS } from "@/repositories/scout.games";
import { prisma } from "@/services/prisma";

/** Days before a checkpoint starts whose activity the goal check and the plan read. */
const LEAD_IN_DAYS = 14;
/** Enough for a month of a busy team; older events past it are said to exist. */
const ACTIVITY_LIMIT = 60;
const day = (date: Date | string) => new Date(date).toISOString().slice(0, 10);

/**
 * What has to be done on the checkpoint's stage before the project can move to
 * the next one — its required tasks, done or not — and, apart, the ones it
 * only suggests.
 */
async function stagePath(stepId: string | null, stageName: string) {
	if (!stepId) return `Stage: ${stageName}.`;

	const step = await prisma.projectWorkflowStep.findUnique({
		where: { id: stepId },
		select: {
			order: true,
			description: true,
			projectWorkflowId: true,
			tasks: {
				orderBy: { order: "asc" },
				select: { name: true, required: true, done: true },
			},
		},
	});
	if (!step) return `Stage: ${stageName}.`;

	const next = await prisma.projectWorkflowStep.findFirst({
		where: {
			projectWorkflowId: step.projectWorkflowId,
			order: { gt: step.order },
		},
		orderBy: { order: "asc" },
		select: { name: true },
	});

	// A `notion::…` description points at content kept elsewhere (GDHUB-97), not text.
	const about = step.description?.includes("::")
		? null
		: step.description?.trim();

	const line = (task: { name: string | null; done: boolean }) =>
		task.name ? [`- [${task.done ? "x" : " "}] ${task.name}`] : [];
	const required = step.tasks.filter((task) => task.required).flatMap(line);
	// Optional tasks never hold the stage; listed with the required ones, the
	// model read them as owed and would not close a stage that was done.
	const optional = step.tasks.filter((task) => !task.required).flatMap(line);

	return [
		`Stage: ${stageName}.${about ? ` ${about}` : ""}`,
		next
			? `To move on to "${next.name}", only this has to be done on this stage:`
			: "This is the last stage of the path. What it requires:",
		required.length ? required.join("\n") : "- (nothing is required)",
		...(optional.length
			? [
					"Suggested on this stage, not required — they never hold it:",
					optional.join("\n"),
				]
			: []),
	].join("\n");
}

/** The team as it stands: role, stated hours, and the weeks each confirmed working. */
/** A member's role on the project, as the AI curator names them: no name. */
export const memberRole = (member: {
	position: string | null;
	speciality: { name: string } | null;
}) => member.position || member.speciality?.name || "no role set";

async function teamLines(checkpointId: string, projectId: string) {
	const [members, pulses] = await Promise.all([
		prisma.teamMember.findMany({
			where: { team: { projectId }, ...CONFIRMED_MEMBERS },
			select: {
				id: true,
				position: true,
				speciality: { select: { name: true, level: true } },
				user: {
					select: { name: true, profile: { select: { timeForWork: true } } },
				},
			},
		}),
		prisma.checkpointPulse.findMany({
			where: { checkpointId },
			select: { teamMemberId: true, week: true, confirmedAt: true },
		}),
	]);
	if (!members.length) return "Team: nobody has joined yet.";

	const lines = members.map((member) => {
		const role = memberRole(member);
		const level = member.speciality?.level
			? `, ${member.speciality.level}`
			: "";
		const hours = weeklyRange(member.user.profile?.timeForWork);
		const stated = hours
			? `, ${hoursSpan(hours)} h/week stated`
			: ", hours not stated";
		const weeks = pulses
			.filter((pulse) => pulse.teamMemberId === member.id)
			.sort((a, b) => a.week - b.week)
			.map(
				(pulse) =>
					`week ${pulse.week} ${pulse.confirmedAt ? "worked" : "not confirmed"}`,
			);

		return `- ${member.user.name ?? "A member"}: ${role}${level}${stated}${
			weeks.length ? `; ${weeks.join(", ")}` : ""
		}`;
	});

	return `Team (${members.length}):\n${lines.join("\n")}`;
}

const ACTIVITY_LINE = {
	artifact: (actor: string, subject: string) => `${actor} added "${subject}"`,
	joined: (actor: string, subject: string) => `${actor} joined as ${subject}`,
	left: (actor: string, subject: string) => `${actor} (${subject}) left`,
	vacancyOpened: (_: string, subject: string) => `an open position: ${subject}`,
	vacancyClosed: (_: string, subject: string) =>
		`the open position closed: ${subject}`,
} as const;

/**
 * What happened on the project between two dates, oldest first. Devlogs are
 * read in full elsewhere, and the stage does not move inside a checkpoint.
 */
async function activityLines(projectId: string, from: Date, to: Date) {
	const { events: page } = await getProjectActivity(projectId, {
		before: to,
		limit: ACTIVITY_LIMIT,
	});
	const shown = page
		.filter((event) => new Date(event.at) >= from)
		.flatMap((event) => {
			const line = ACTIVITY_LINE[event.kind as keyof typeof ACTIVITY_LINE];
			return line
				? [
						`- ${day(event.at)} · ${line(event.actor ?? "Someone", event.subject ?? "untitled")}`,
					]
				: [];
		})
		.reverse();
	const more =
		page.length === ACTIVITY_LIMIT && new Date(page.at(-1)?.at ?? to) >= from
			? "\n- (earlier events in this period not listed)"
			: "";

	return shown.length
		? `What happened on the project from ${day(from)} to ${day(to)}:\n${shown.join("\n")}${more}`
		: `Nothing else happened on the project from ${day(from)} to ${day(to)}.`;
}

/**
 * The project as a curator who opened its page would see it, for one moment of
 * the checkpoint: where it stands on its path, who is on the team and how the
 * weeks went, and what happened in the period. Only what the author can see.
 *
 * Before the checkpoint starts the period is the two weeks leading in.
 */
export async function projectPicture(
	checkpointId: string,
	period?: { from: Date; to: Date },
) {
	const checkpoint = await prisma.projectCheckpoint.findUniqueOrThrow({
		where: { id: checkpointId },
		select: {
			projectId: true,
			stepId: true,
			stageName: true,
			startedAt: true,
		},
	});
	const to = period?.to ?? new Date();
	const from =
		period?.from ??
		new Date(
			(checkpoint.startedAt ?? to).getTime() - LEAD_IN_DAYS * MS_PER_DAY,
		);

	const [path, team, activity] = await Promise.all([
		stagePath(checkpoint.stepId, checkpoint.stageName),
		teamLines(checkpointId, checkpoint.projectId),
		activityLines(checkpoint.projectId, from, to),
	]);

	return [path, team, activity].join("\n\n");
}

/** The period of the whole run, for the final review. */
export const runPeriod = (startedAt: Date, dueAt: Date | null) => ({
	from: startedAt,
	to: dueAt ?? dueDateFrom(startedAt),
});
