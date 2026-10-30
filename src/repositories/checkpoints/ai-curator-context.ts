import {
	CURATOR_ACTIVITY_LIMIT,
	CURATOR_MARKETING_DEVLOGS,
	CURATOR_STAGE_BRIEFS,
	CURATOR_STAGE_GOALS,
	LEAD_IN_DAYS,
} from "@/config/checkpoint";
import { TeamMemberStatus, TeamVacancyStatus } from "@/config/prisma-enums";
import { teamCapacity, weeklyRange } from "@/lib/checkpoints/capacity";
import { dueDateFrom, MS_PER_DAY } from "@/lib/checkpoints/days";
import { lensWeights } from "@/lib/checkpoints/lenses";
import { getProjectActivity } from "@/repositories/project/activity";
import { CONFIRMED_MEMBERS } from "@/repositories/project/team";
import { prisma } from "@/services/prisma";
import type {
	CuratorMarketing,
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
		goal: CURATOR_STAGE_GOALS[currentStage] ?? null,
		lenses: lensWeights(currentStage),
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

/**
 * What the audience was told in a period and how it answered (GDHUB-126): the
 * public devlogs with their applause and views, and where the game can be found.
 */
export async function curatorMarketing(
	projectId: string,
	period: { from: Date; to: Date },
): Promise<CuratorMarketing> {
	const [posts, project] = await Promise.all([
		prisma.projectReport.findMany({
			where: {
				projectId,
				isSystem: false,
				publishedAt: { gte: period.from, lt: period.to },
			},
			orderBy: { publishedAt: "desc" },
			take: CURATOR_MARKETING_DEVLOGS,
			select: {
				number: true,
				content: true,
				publishedAt: true,
				viewsCount: true,
				applauseActivities: {
					select: { _count: { select: { applauses: true } } },
				},
			},
		}),
		prisma.project.findUnique({
			where: { id: projectId },
			select: { links: true },
		}),
	]);

	return {
		devlogs: posts.map((post) => ({
			title: `Devlog${post.number ? ` #${post.number}` : ""}: ${firstLine(post.content)}`,
			publishedAt: day(post.publishedAt),
			applause: post.applauseActivities.reduce(
				(sum, activity) => sum + activity._count.applauses,
				0,
			),
			views: post.viewsCount,
		})),
		links: ((project?.links ?? []) as { platform?: string; link?: string }[])
			.filter((row) => row.link)
			.map((row) => `${row.platform ?? "Link"}: ${row.link}`),
	};
}

const firstLine = (content: string) =>
	(content.split("\n").find((line) => line.trim()) ?? "").trim().slice(0, 120);

/**
 * Everything every review moment reads about a checkpoint for one period
 * (GDHUB-126), so the moments cannot drift apart: the stage with its lens
 * weights, the team, what happened on the project and what the audience saw.
 * Without a period it is the lead-in, as `projectPicture` reads it.
 */
export async function checkpointFacts(
	checkpoint: {
		id: string;
		projectId: string;
		stepId: string | null;
		stageName: string;
		/** Who joined after it is told apart; null before the start. */
		startedAt: Date | null;
	},
	period?: { from: Date; to: Date },
) {
	const now = new Date();
	const marketingPeriod = period ?? {
		from: new Date(
			(checkpoint.startedAt ?? now).getTime() - LEAD_IN_DAYS * MS_PER_DAY,
		),
		to: now,
	};
	const [workflow, team, picture, marketing] = await Promise.all([
		stageWorkflow(checkpoint.stepId, checkpoint.stageName),
		curatorTeam(checkpoint.id, checkpoint.projectId, checkpoint.startedAt),
		projectPicture(checkpoint.id, period),
		curatorMarketing(checkpoint.projectId, marketingPeriod),
	]);
	return { workflow, team, picture, marketing };
}

export type CheckpointFacts = Awaited<ReturnType<typeof checkpointFacts>>;
