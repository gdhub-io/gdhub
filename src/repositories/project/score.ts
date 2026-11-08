import { activityScore, MONTH_MS } from "@/lib/scout/activity-score";
import type { GameScoreInputs } from "@/lib/scout/game-score";
import { prisma } from "@/services/prisma";

/** What `gameScores` blends, one row per id in the same order; a project with no activity gets zeros. */
export async function getGameScoreInputs(
	projectIds: string[],
	now = new Date(),
): Promise<GameScoreInputs[]> {
	if (!projectIds.length) return [];

	const [projects, applause, recentReports, devlogViews] = await Promise.all([
		prisma.project.findMany({
			where: { id: { in: projectIds } },
			select: {
				id: true,
				updatedAt: true,
				viewsCount: true,
			},
		}),
		prisma.project.getApplauseCounts({ projectIds }),
		prisma.projectReport.groupBy({
			by: ["projectId"],
			where: {
				projectId: { in: projectIds },
				publishedAt: { gt: new Date(now.getTime() - MONTH_MS) },
			},
			_count: { _all: true },
		}),
		prisma.projectReport.groupBy({
			by: ["projectId"],
			where: { projectId: { in: projectIds } },
			_count: { _all: true },
			_sum: { viewsCount: true },
		}),
	]);

	const recentBy = new Map(
		recentReports.map((r) => [r.projectId, r._count._all]),
	);
	const devlogsBy = new Map(devlogViews.map((r) => [r.projectId, r]));
	const projectBy = new Map(projects.map((p) => [p.id, p]));

	return projectIds.map((id) => {
		const project = projectBy.get(id);
		if (!project) return { activity: 0, applause: 0, views: 0 };
		const devlogs = devlogsBy.get(id);
		return {
			activity: activityScore(
				devlogs?._count._all ?? 0,
				recentBy.get(id) ?? 0,
				project.updatedAt,
				now.getTime(),
			),
			applause: applause.get(id) ?? 0,
			views: project.viewsCount + (devlogs?._sum.viewsCount ?? 0),
		};
	});
}
