import type { ProjectStatus } from "@gdhub-io/gdhub-prisma";
import { TRAILS_WINDOW_DAYS } from "@/config/project-trails";
import { MS_PER_DAY } from "@/lib/checkpoints/days";
import { CHECKPOINT_RAN_STATUSES } from "@/lib/checkpoints/status";
import { gameScores } from "@/lib/scout/game-score";
import {
	TRAIL_STATUS_BY_PROJECT_STATUS,
	toProjectTrail,
} from "@/lib/workflow/project-trails";
import { getGameScoreInputs } from "@/repositories/project/score";
import { DEFAULT_WORKFLOW_SCHEMA } from "@/repositories/project/workflow";
import { ABANDONED_FILTER } from "@/repositories/scout/games";
import { prisma } from "@/services/prisma";
import type { ProjectTrailDto } from "@/types/project-trails";

const PUBLIC_STATUSES = Object.keys(
	TRAIL_STATUS_BY_PROJECT_STATUS,
) as ProjectStatus[];

/** The projects the trails graph considers, before `toProjectTrail` drops any. */
export function getTrailRows(now = new Date()) {
	const since = new Date(now.getTime() - TRAILS_WINDOW_DAYS * MS_PER_DAY);
	return prisma.project.findMany({
		where: {
			status: { in: PUBLIC_STATUSES },
			// Rings are the default template's stages; a custom workflow has no place on them.
			workflow: { is: { schema: { is: { name: DEFAULT_WORKFLOW_SCHEMA } } } },
			// In work during the window, by real events: updatedAt also moves on every page view.
			OR: [
				{ createdAt: { gte: since } },
				{ statusChangedAt: { gte: since } },
				{ reports: { some: { publishedAt: { gte: since } } } },
				{ checkpoints: { some: { startedAt: { gte: since } } } },
				{
					workflow: {
						is: { steps: { some: { finishedAt: { gte: since } } } },
					},
				},
			],
			...ABANDONED_FILTER,
		},
		orderBy: { startedAt: "asc" },
		select: {
			id: true,
			slug: true,
			name: true,
			coverImage: true,
			status: true,
			createdAt: true,
			workflow: {
				select: {
					currentStepId: true,
					steps: {
						select: {
							id: true,
							order: true,
							name: true,
							done: true,
							finishedAt: true,
							plannedAt: true,
						},
					},
				},
			},
			checkpoints: {
				where: { status: { in: CHECKPOINT_RAN_STATUSES } },
				select: {
					stepId: true,
					order: true,
					status: true,
					startedAt: true,
				},
			},
		},
	});
}

/**
 * Every public project's road through the default workflow, for the trails graph.
 * Reads nothing about people: no author, team or curator, only what the
 * project page already shows to anyone.
 */
export async function getPublicProjectTrails(
	now = new Date(),
): Promise<ProjectTrailDto[]> {
	const rows = await getTrailRows(now);
	const trails = rows.flatMap((row) => toProjectTrail(row) ?? []);
	const scores = gameScores(
		await getGameScoreInputs(
			trails.map((trail) => trail.id),
			now,
		),
	);
	return trails.map((trail, index) => ({ ...trail, score: scores[index] }));
}
