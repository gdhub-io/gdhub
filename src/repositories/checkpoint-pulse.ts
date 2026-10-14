import { CheckpointStatus } from "@/config/prisma-enums";
import { dayNumberOn } from "@/lib/checkpoint-days";
import { dateOfDay } from "@/lib/checkpoint-plan";
import { pulseIdOf, pulseToken } from "@/lib/checkpoint-pulse-token";
import { sessionDay } from "@/lib/checkpoint-sessions";
import {
	devlogDayOf,
	sprintOfDay,
	sprintRange,
} from "@/lib/checkpoint-sprints";
import { pulseCell } from "@/repositories/checkpoint.repository";
import { checkpointNumber } from "@/repositories/checkpoint-number";
import { CONFIRMED_MEMBERS } from "@/repositories/scout.games";
import { appUrl, notify } from "@/services/checkpoint-notifications";
import { prisma } from "@/services/prisma";
import type { CheckpointPulseCellDto } from "@/types/checkpoints";

/**
 * The daily run, on a sprint's last day: everyone on the team is either shown
 * working already — a devlog or an artifact of theirs landed in the sprint —
 * or asked once, by a letter whose link answers without signing in.
 */
export const requestPulses = async (now = new Date()) => {
	const checkpoints = await prisma.projectCheckpoint.findMany({
		where: { status: CheckpointStatus.Active, startedAt: { not: null } },
		select: {
			id: true,
			startedAt: true,
			projectId: true,
			curatorId: true,
			project: {
				select: {
					name: true,
					team: {
						select: {
							members: {
								where: CONFIRMED_MEMBERS,
								select: {
									id: true,
									user: { select: { id: true, email: true } },
								},
							},
						},
					},
				},
			},
		},
	});

	let asked = 0;
	let counted = 0;
	for (const checkpoint of checkpoints) {
		if (!checkpoint.startedAt) continue;
		const day = dayNumberOn(checkpoint.startedAt, now);
		const sprint = sprintOfDay(day);
		if (day !== devlogDayOf(sprint)) continue;

		const { from } = sprintRange(checkpoint.startedAt, sprint);
		const inSprint = {
			gte: from,
			lt: dateOfDay(checkpoint.startedAt, day + 1),
		};
		const [devlogs, artifacts, pulses] = await Promise.all([
			prisma.projectReport.findMany({
				where: { projectId: checkpoint.projectId, publishedAt: inSprint },
				select: { authorId: true },
			}),
			prisma.projectArtifact.findMany({
				where: { projectId: checkpoint.projectId, createdAt: inSprint },
				select: { createdById: true },
			}),
			prisma.checkpointPulse.findMany({
				where: { checkpointId: checkpoint.id, week: sprint },
				select: { teamMemberId: true },
			}),
		]);
		const wrote = new Set(devlogs.map((row) => row.authorId));
		const made = new Set(artifacts.map((row) => row.createdById));
		const already = new Set(pulses.map((row) => row.teamMemberId));

		for (const member of checkpoint.project.team?.members ?? []) {
			if (already.has(member.id)) continue;
			if (member.user.id === checkpoint.curatorId) continue;

			const key = {
				checkpointId: checkpoint.id,
				teamMemberId: member.id,
				week: sprint,
			};
			let source: "devlog" | "artifact" | null = null;
			if (wrote.has(member.user.id)) source = "devlog";
			else if (made.has(member.user.id)) source = "artifact";
			if (source) {
				await prisma.checkpointPulse.create({
					data: { ...key, requestedAt: now, confirmedAt: now, source },
				});
				counted += 1;
				continue;
			}

			const pulse = await prisma.checkpointPulse.create({
				data: { ...key, requestedAt: now },
			});
			await notify(member.user, `cp-pulse-${pulse.id}`, {
				title: `Were you working on ${checkpoint.project.name} this sprint?`,
				message:
					"Answer in one click — your curator reads the team's pulse at the next call. If you weren't working on it this sprint, ignore this email.",
				redirectUrl: `${appUrl()}/pulse/${pulseToken(pulse.id)}`,
			});
			asked += 1;
		}
	}
	return { asked, counted };
};

export type PulseState = "open" | "confirmed" | "closed";

export type PulseViewDto = {
	state: PulseState;
	firstName: string;
	project: { name: string; slug: string };
	number: number;
	sprint: number;
	from: string;
	to: string;
	/** Only the sprints the person was on the team for. */
	cells: Pick<CheckpointPulseCellDto, "sprint" | "state">[];
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
	const cells = [1, 2, 3, 4]
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
