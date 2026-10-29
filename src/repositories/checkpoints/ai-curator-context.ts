import {
	CURATOR_ACTIVITY_LIMIT,
	CURATOR_STAGE_BRIEFS,
	LEAD_IN_DAYS,
} from "@/config/checkpoint";
import { TeamMemberStatus, TeamVacancyStatus } from "@/config/prisma-enums";
import { teamCapacity, weeklyRange } from "@/lib/checkpoints/capacity";
import { dueDateFrom, MS_PER_DAY } from "@/lib/checkpoints/days";
import { getProjectActivity } from "@/repositories/project-activity.repository";
import { CONFIRMED_MEMBERS } from "@/repositories/scout.games";
import { prisma } from "@/services/prisma";
import type {
	CuratorPersona,
	CuratorTeam,
	CuratorWorkflow,
} from "@/types/checkpoint-curator";

const day = (date: Date | string) => new Date(date).toISOString().slice(0, 10);

/**
 * Where the project stands on its workflow, for the curator: the stage, the
 * next one, what the stage is for (the curator's brief, not the author's Notion
 * advice) and its required tasks, done or not. The optional ones are the
 * author's call and never reach the model (Dmitry, 2026-10-26).
 */
export async function stageWorkflow(
	stepId: string | null,
	currentStage: string,
): Promise<CuratorWorkflow> {
	const step = stepId
		? await prisma.projectWorkflowStep.findUnique({
				where: { id: stepId },
				select: {
					order: true,
					projectWorkflowId: true,
					tasks: {
						where: { required: true },
						orderBy: { order: "asc" },
						select: { name: true, done: true },
					},
				},
			})
		: null;
	const next = step
		? await prisma.projectWorkflowStep.findFirst({
				where: {
					projectWorkflowId: step.projectWorkflowId,
					order: { gt: step.order },
				},
				orderBy: { order: "asc" },
				select: { name: true },
			})
		: null;

	return {
		currentStage,
		nextStage: next?.name ?? null,
		description: CURATOR_STAGE_BRIEFS[currentStage] ?? null,
		requiredTasks: (step?.tasks ?? []).flatMap((task) =>
			task.name ? [{ name: task.name, done: task.done }] : [],
		),
	};
}

/** A member's role on the project: what they set, else their speciality. */
export const memberRole = (
	member: { position: string | null; speciality: { name: string } | null },
	fallback = "no role set",
) => member.position || member.speciality?.name || fallback;

/**
 * The team as it stands, for every call in one place: each member's role,
 * level, stated hours and the weeks they confirmed, and the hours summed.
 */
export async function curatorTeam(
	checkpointId: string,
	projectId: string,
	/** Who joined after it is told apart; null before the checkpoint starts. */
	startedAt: Date | null,
): Promise<CuratorTeam> {
	const [members, pulses, vacancies] = await Promise.all([
		prisma.teamMember.findMany({
			where: { team: { projectId }, ...CONFIRMED_MEMBERS },
			select: {
				id: true,
				startedAt: true,
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
		prisma.teamVacancy.findMany({
			where: {
				team: { projectId },
				status: TeamVacancyStatus.Published,
			},
			orderBy: { publishedAt: "asc" },
			select: {
				title: true,
				publishedAt: true,
				createdAt: true,
				_count: {
					select: {
						applicants: { where: { status: TeamMemberStatus.Applicant } },
					},
				},
			},
		}),
	]);

	return {
		...teamCapacity(
			members.map((member) => ({
				timeForWork: member.user.profile?.timeForWork,
			})),
		),
		people: members.map((member) => ({
			name: member.user.name ?? "A member",
			role: memberRole(member),
			level: member.speciality?.level ?? null,
			hoursPerWeek: weeklyRange(member.user.profile?.timeForWork),
			weeks: pulses
				.filter((pulse) => pulse.teamMemberId === member.id)
				.sort((a, b) => a.week - b.week)
				.map((pulse) => !!pulse.confirmedAt),
			joinedOn:
				startedAt && member.startedAt > startedAt
					? day(member.startedAt)
					: null,
		})),
		openings: vacancies.map((vacancy) => ({
			role: vacancy.title,
			postedOn: day(vacancy.publishedAt ?? vacancy.createdAt),
			applied: vacancy._count.applicants,
		})),
	};
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
async function activityLines(
	projectId: string,
	from: Date,
	to: Date,
	leadIn = false,
) {
	const { events: page } = await getProjectActivity(projectId, {
		before: to,
		limit: CURATOR_ACTIVITY_LIMIT,
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
		page.length === CURATOR_ACTIVITY_LIMIT &&
		new Date(page.at(-1)?.at ?? to) >= from
			? "\n- (earlier events in this period not listed)"
			: "";

	const period = leadIn
		? `in the two weeks before the checkpoint started, from ${day(from)} to ${day(to)}`
		: `from ${day(from)} to ${day(to)}`;
	return shown.length
		? `What happened on the project ${period}:\n${shown.join("\n")}${more}`
		: `Nothing else happened on the project ${period}.`;
}

/**
 * What happened on the project in one period of the checkpoint, as its
 * activity feed shows it. The stage is `stageWorkflow`, the team `curatorTeam`.
 *
 * Without a period it is the two weeks leading in, said as such: the curator
 * reads it on day 1 and must not take it for work done in the checkpoint.
 */
export async function projectPicture(
	checkpointId: string,
	period?: { from: Date; to: Date },
) {
	const checkpoint = await prisma.projectCheckpoint.findUniqueOrThrow({
		where: { id: checkpointId },
		select: { projectId: true, startedAt: true },
	});
	const to = period?.to ?? new Date();
	const from =
		period?.from ??
		new Date(
			(checkpoint.startedAt ?? to).getTime() - LEAD_IN_DAYS * MS_PER_DAY,
		);

	return activityLines(checkpoint.projectId, from, to, !period);
}

/** The period of the whole run, for the final review. */
export const runPeriod = (startedAt: Date, dueAt: Date | null) => ({
	from: startedAt,
	to: dueAt ?? dueDateFrom(startedAt),
});

/** The project author's favourite genres, settings and kinds of game, as their profile states them. */
export const curatorPersona = async (
	projectId: string,
): Promise<CuratorPersona> => {
	const profile = await prisma.profile.findFirst({
		where: { user: { projects: { some: { id: projectId } } } },
		select: {
			preferredGenres: { select: { name: true } },
			preferredSettings: { select: { name: true } },
			preferredLevels: { select: { name: true } },
		},
	});
	const names = (rows?: { name: string }[]) =>
		(rows ?? []).map((row) => row.name);
	return {
		genres: names(profile?.preferredGenres),
		settings: names(profile?.preferredSettings),
		levels: names(profile?.preferredLevels),
	};
};
