import { ProjectStatus } from "@gdhub-io/gdhub-prisma";
import { runWithCronLog } from "@/decorators/QueueCronLog";
import { json, withAuth } from "@/lib/api-handlers";
import {
	resolveDormantTransition,
	shouldGoDormant,
} from "@/lib/project-status";
import { getLastProjectActivity } from "@/repositories/project/activity";
import { prisma } from "@/services/prisma";
import { isProjectAvailableOnStores } from "@/services/prisma/queries";
import {
	archive,
	IDLE_PROJECT_SELECT,
	IDLE_PROJECT_WHERE,
	putToSleep,
	wake,
} from "@/services/project/dormancy";

export const GET = withAuth({ mode: "vercel_cron" })(async () => {
	const result = await runWithCronLog(
		"project-status-maintenance",
		async () => {
			const now = new Date();
			const projects = await prisma.project.findMany({
				where: {
					...IDLE_PROJECT_WHERE,
					status: { in: [ProjectStatus.Approved, ProjectStatus.Dormant] },
				},
				select: { ...IDLE_PROJECT_SELECT, status: true, dormantAt: true },
			});

			if (projects.length === 0) {
				return {
					checkedProjects: 0,
					dormantProjectIds: [],
					reactivatedProjectIds: [],
					archivedProjectIds: [],
				};
			}

			const lastActivityByProject = await getLastProjectActivity(
				projects.map((project) => project.id),
			);

			const dormantProjectIds: string[] = [];
			const reactivatedProjectIds: string[] = [];
			const archivedProjectIds: string[] = [];

			for (const project of projects) {
				const lastActivityAt = lastActivityByProject.get(project.id);
				if (!lastActivityAt) continue;

				if (
					project.status === ProjectStatus.Approved &&
					shouldGoDormant({
						lastActivityAt,
						onStores: isProjectAvailableOnStores(project),
						now,
					})
				) {
					await putToSleep(project, now);
					dormantProjectIds.push(project.id);
					continue;
				}

				if (project.status !== ProjectStatus.Dormant || !project.dormantAt)
					continue;

				const transition = resolveDormantTransition({
					dormantAt: project.dormantAt,
					lastActivityAt,
					now,
				});
				if (transition === "reactivate") {
					await wake(project, now);
					reactivatedProjectIds.push(project.id);
				}
				if (transition === "archive") {
					await archive(project, now);
					archivedProjectIds.push(project.id);
				}
			}

			return {
				checkedProjects: projects.length,
				dormantProjectIds,
				reactivatedProjectIds,
				archivedProjectIds,
			};
		},
	);

	return json(result ?? null);
});
