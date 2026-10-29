import { SPRINTS_PER_CHECKPOINT } from "@/config/checkpoint";
import { sessionDay } from "@/lib/checkpoints/days";
import { dateOfDay } from "@/lib/checkpoints/plan";
import { pulseIdOf } from "@/lib/checkpoints/pulse-token";
import { sprintRange } from "@/lib/checkpoints/sprints";
import { pulseCell } from "@/repositories/checkpoints/detail";
import { checkpointNumber } from "@/repositories/checkpoints/number";
import { prisma } from "@/services/prisma";
import type { PulseState, PulseViewDto } from "@/types/checkpoints";
/**
 * Who of `userIds` changed anything of the project in the window — a task
 * ticked, a vacancy posted, an invitation sent, the plan edited: every write
 * the audit log keeps, traced back to the project through what it touched.
 */
export const activeOnProject = async (
	projectId: string,
	userIds: string[],
	window: { gte: Date; lt: Date },
) => {
	if (!userIds.length) return new Set<string>();
	const project = await prisma.project.findUnique({
		where: { id: projectId },
		select: {
			team: {
				select: {
					id: true,
					members: { select: { id: true } },
					vacancies: { select: { id: true } },
					invitations: { select: { id: true } },
				},
			},
			workflow: {
				select: {
					id: true,
					steps: { select: { id: true, tasks: { select: { id: true } } } },
				},
			},
			reports: { select: { id: true } },
			artifacts: { select: { id: true } },
			checkpoints: { select: { id: true } },
		},
	});
	if (!project) return new Set<string>();
	const ids = (rows: { id: string }[] = []) => rows.map((row) => row.id);
	const { team, workflow } = project;
	const owned: Record<string, string[]> = {
		Project: [projectId],
		Team: team ? [team.id] : [],
		TeamMember: ids(team?.members),
		TeamVacancy: ids(team?.vacancies),
		TeamInvitation: ids(team?.invitations),
		ProjectWorkflow: workflow ? [workflow.id] : [],
		ProjectWorkflowStep: ids(workflow?.steps),
		ProjectWorkflowTask:
			workflow?.steps.flatMap((step) => ids(step.tasks)) ?? [],
		ProjectReport: ids(project.reports),
		ProjectArtifact: ids(project.artifacts),
		ProjectCheckpoint: ids(project.checkpoints),
	};
	const rows = await prisma.auditLog.findMany({
		where: {
			actorUserId: { in: userIds },
			createdAt: window,
			OR: Object.entries(owned)
				.filter(([, entityIds]) => entityIds.length)
				.map(([entity, entityIds]) => ({
					entity,
					entityId: { in: entityIds },
				})),
		},
		distinct: ["actorUserId"],
		select: { actorUserId: true },
	});
	return new Set(
		rows.map((row) => row.actorUserId).filter((id) => id !== null),
	);
};

const loadPulse = async (token: string) => {
	const id = pulseIdOf(token);
	if (!id) return null;
	return prisma.checkpointPulse.findUnique({
		where: { id },
		select: {
			id: true,
			week: true,
			confirmedAt: true,
			teamMemberId: true,
			teamMember: {
				select: {
					startedAt: true,
					finishedAt: true,
					user: { select: { name: true } },
				},
			},
			checkpoint: {
				select: {
					projectId: true,
					createdAt: true,
					startedAt: true,
					project: { select: { name: true, slug: true } },
					sessions: { select: { index: true, scheduledAt: true } },
					pulses: {
						select: {
							teamMemberId: true,
							week: true,
							confirmedAt: true,
							source: true,
						},
					},
				},
			},
		},
	});
};

type LoadedPulse = NonNullable<Awaited<ReturnType<typeof loadPulse>>>;

/**
 * A pulse is answered until the call that opens the next sprint; the fourth
 * sprint's is the final call. Without a stored call, the end of that call's day.
 */
const closesAt = (pulse: LoadedPulse, startedAt: Date) => {
	const next = pulse.week + 1;
	const call = pulse.checkpoint.sessions.find((row) => row.index === next);
	return call?.scheduledAt ?? dateOfDay(startedAt, sessionDay(next) + 1);
};

const toView = async (
	pulse: LoadedPulse,
	now: Date,
): Promise<PulseViewDto | null> => {
	const { checkpoint, teamMember } = pulse;
	if (!checkpoint.startedAt) return null;
	const startedAt = checkpoint.startedAt;

	let state: PulseState = "closed";
	if (pulse.confirmedAt) state = "confirmed";
	else if (now < closesAt(pulse, startedAt)) state = "open";
	const mine = new Map(
		checkpoint.pulses
			.filter((row) => row.teamMemberId === pulse.teamMemberId)
			.map((row) => [row.week, row]),
	);
	const cells = Array.from({ length: SPRINTS_PER_CHECKPOINT }, (_, i) => i + 1)
		.map((sprint) =>
			pulseCell(sprint, teamMember, mine.get(sprint), startedAt, now),
		)
		.filter((cell) => cell.state !== "notOnTeam")
		// This pulse is answerable on its page even after its sprint has ended.
		.map((cell) =>
			cell.sprint === pulse.week && state === "open"
				? { sprint: cell.sprint, state: "waiting" as const }
				: { sprint: cell.sprint, state: cell.state },
		);
	const { from, to } = sprintRange(startedAt, pulse.week);

	return {
		state,
		firstName: teamMember.user.name?.split(" ")[0] ?? "",
		project: checkpoint.project,
		number: await checkpointNumber(checkpoint),
		sprint: pulse.week,
		from: from.toISOString(),
		to: to.toISOString(),
		cells,
	};
};

/** What the pulse page shows. Reading never writes: mail scanners open links. */
export const pulseView = async (token: string, now = new Date()) => {
	const pulse = await loadPulse(token);
	return pulse ? toView(pulse, now) : null;
};

/** The button: once, and only while the pulse is still open. */
export const confirmPulse = async (token: string, now = new Date()) => {
	const pulse = await loadPulse(token);
	if (!pulse) return null;
	const view = await toView(pulse, now);
	if (view?.state !== "open") return view;

	await prisma.checkpointPulse.updateMany({
		where: { id: pulse.id, confirmedAt: null },
		data: { confirmedAt: now, source: "email" },
	});
	return pulseView(token, now);
};
