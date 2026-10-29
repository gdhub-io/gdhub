import { CheckpointCuratorKind, CheckpointStatus } from "@/config/prisma-enums";
import { dayNumberOn } from "@/lib/checkpoints/days";
import { appUrl } from "@/lib/checkpoints/hrefs";
import { dateOfDay } from "@/lib/checkpoints/plan";
import { pulseToken } from "@/lib/checkpoints/pulse-token";
import {
	devlogDayOf,
	sprintOfDay,
	sprintRange,
} from "@/lib/checkpoints/sprints";
import { activeOnProject } from "@/repositories/checkpoints/pulse";
import { CONFIRMED_MEMBERS } from "@/repositories/scout/games";
import { notify } from "@/services/checkpoints/notifications";
import { prisma } from "@/services/prisma";

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
			curatorKind: true,
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
		// The audit log is read only for those no devlog, artifact or pulse covers.
		const busy = await activeOnProject(
			checkpoint.projectId,
			(checkpoint.project.team?.members ?? [])
				.filter(
					(member) =>
						!already.has(member.id) &&
						member.user.id !== checkpoint.curatorId &&
						!wrote.has(member.user.id) &&
						!made.has(member.user.id),
				)
				.map((member) => member.user.id),
			inSprint,
		);

		for (const member of checkpoint.project.team?.members ?? []) {
			if (already.has(member.id)) continue;
			if (member.user.id === checkpoint.curatorId) continue;

			const key = {
				checkpointId: checkpoint.id,
				teamMemberId: member.id,
				week: sprint,
			};
			let source: "devlog" | "artifact" | "activity" | null = null;
			if (wrote.has(member.user.id)) source = "devlog";
			else if (made.has(member.user.id)) source = "artifact";
			else if (busy.has(member.user.id)) source = "activity";
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
				checkpointId: checkpoint.id,
				title: `Were you working on ${checkpoint.project.name} this sprint?`,
				message: `Answer in one click — your curator reads the team's pulse ${checkpoint.curatorKind === CheckpointCuratorKind.AI ? "for the sprint review" : "at the next call"}. If you weren't working on it this sprint, ignore this email.`,
				redirectUrl: `${appUrl()}/pulse/${pulseToken(pulse.id)}`,
			});
			asked += 1;
		}
	}
	return { asked, counted };
};
