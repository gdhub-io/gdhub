import { ProjectStatus } from "@gdhub-io/gdhub-prisma";
import dayjs from "dayjs";
import { runWithCronLog } from "@/decorators/QueueCronLog";
import { json, withAuth } from "@/lib/api-handlers";
import {
	DORMANT_AFTER_MONTHS,
	resolveDormantTransition,
	statusChangeData,
} from "@/lib/project-status";
import { getLastProjectActivity } from "@/repositories/project/activity";
import { NovuService } from "@/services/novu";
import { prisma } from "@/services/prisma";
import { isProjectAvailableOnStores } from "@/services/prisma/queries";
import { putToSleep } from "@/services/project/dormancy";

export const GET = withAuth({ mode: "vercel_cron" })(async () => {
	const result = await runWithCronLog(
		"project-status-maintenance",
		async () => {
			const now = new Date();
			const dormantThreshold = dayjs(now)
				.subtract(DORMANT_AFTER_MONTHS, "month")
				.toDate();

			const projects = await prisma.project.findMany({
				where: {
					status: {
						in: [ProjectStatus.Approved, ProjectStatus.Dormant],
					},
					finishedAt: { equals: null },
					author: {
						profile: {
							isActive: true,
						},
					},
				},
				select: {
					id: true,
					name: true,
					slug: true,
					status: true,
					dormantAt: true,
					authorId: true,
					links: true,
					workflow: {
						select: { currentStep: { select: { order: true } } },
					},
					author: {
						select: {
							email: true,
							lang: true,
							profile: {
								select: {
									isActive: true,
								},
							},
						},
					},
				},
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
					!isProjectAvailableOnStores(project) &&
					lastActivityAt <= dormantThreshold
				) {
					await putToSleep(project, now);
					dormantProjectIds.push(project.id);
					continue;
				}

				if (project.status === ProjectStatus.Dormant) {
					if (!project.dormantAt) continue;

					const transition = resolveDormantTransition({
						dormantAt: project.dormantAt,
						lastActivityAt,
						now,
					});

					if (transition === "reactivate") {
						await prisma.project.update({
							where: {
								id: project.id,
								status: ProjectStatus.Dormant,
							},
							data: statusChangeData(ProjectStatus.Approved, now),
						});

						reactivatedProjectIds.push(project.id);
						continue;
					}

					if (transition === "archive") {
						await prisma.project.update({
							where: {
								id: project.id,
								status: ProjectStatus.Dormant,
							},
							data: statusChangeData(ProjectStatus.Archived, now),
						});

						archivedProjectIds.push(project.id);

						try {
							await NovuService.send({
								template: "default-message",
								to: {
									subscriberId: project.authorId,
									email: project.author.email || undefined,
								},
								payload: {
									title: "Project status changed to Archived",
									message: `Your project "${project.name}" was moved to Archived because there was no activity during the Dormant period.`,
									redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/user/project/${project.slug}`,
								},
							});
						} catch (error) {
							console.error(
								`Failed to send Archived notification for project ${project.id}`,
								error,
							);
						}
					}
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
