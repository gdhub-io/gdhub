import { ProjectStatus } from "@gdhub-io/gdhub-prisma";
import dayjs from "dayjs";
import { runWithCronLog } from "@/decorators/QueueCronLog";
import { json, withAuth } from "@/lib/api-handlers";
import { NovuService } from "@/services/novu";
import { prisma } from "@/services/prisma";
import { isProjectAvailableOnStores } from "@/services/prisma/queries";

const DORMANT_AFTER_MONTHS = 3;
const ARCHIVE_AFTER_DORMANT_DAYS = 14;

const pickMaxDate = (current: Date | undefined, candidate?: Date | null) => {
	if (!candidate) return current;
	if (!current) return candidate;
	return candidate > current ? candidate : current;
};

const toMaxDateMap = <TItem>(
	items: TItem[],
	keyOf: (item: TItem) => string,
	dateOf: (item: TItem) => Date,
) => {
	const result = new Map<string, Date>();

	for (const item of items) {
		const key = keyOf(item);
		const date = dateOf(item);
		const existing = result.get(key);

		if (!existing || date > existing) {
			result.set(key, date);
		}
	}

	return result;
};

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
					updatedAt: true,
					dormantAt: true,
					statusChangedAt: true,
					team: {
						select: {
							id: true,
						},
					},
					authorId: true,
					links: true,
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
					archivedProjectIds: [],
				};
			}

			const projectIds = projects.map((project) => project.id);
			const teamIds = projects.flatMap((project) =>
				project.team?.id ? [project.team.id] : [],
			);

			const [
				reports,
				vacancies,
				teamMembers,
				teamInvestors,
				projectEquities,
				workflowUpdates,
				workflowStepUpdates,
				workflows,
				equityAllocations,
				equityPromises,
			] = await Promise.all([
				prisma.projectReport.findMany({
					where: { projectId: { in: projectIds } },
					select: { projectId: true, publishedAt: true },
				}),
				prisma.teamVacancy.findMany({
					where: { teamId: { in: teamIds } },
					select: { teamId: true, updatedAt: true },
				}),
				prisma.teamMember.findMany({
					where: { teamId: { in: teamIds } },
					select: { teamId: true, updatedAt: true },
				}),
				prisma.teamInvestor.findMany({
					where: { teamId: { in: teamIds } },
					select: { teamId: true, updatedAt: true },
				}),
				prisma.projectEquity.findMany({
					where: { projectId: { in: projectIds } },
					select: { id: true, projectId: true, updatedAt: true },
				}),
				prisma.projectWorkflow.findMany({
					where: { projectId: { in: projectIds } },
					select: { id: true, projectId: true, updatedAt: true },
				}),
				prisma.projectWorkflowStep.findMany({
					where: { projectWorkflow: { projectId: { in: projectIds } } },
					select: {
						projectWorkflow: {
							select: { projectId: true },
						},
						updatedAt: true,
					},
				}),
				prisma.projectWorkflow.findMany({
					where: {
						projectId: {
							in: projectIds,
						},
					},
					select: {
						projectId: true,
						currentStep: {
							select: {
								id: true,
								name: true,
								order: true,
							},
						},
						steps: {
							select: {
								id: true,
								name: true,
								order: true,
							},
						},
					},
				}),
				prisma.equityAllocation.findMany({
					where: { equity: { projectId: { in: projectIds } } },
					select: {
						equity: { select: { projectId: true } },
						updatedAt: true,
						id: true,
					},
				}),
				prisma.equityPromise.findMany({
					where: { allocation: { equity: { projectId: { in: projectIds } } } },
					select: {
						allocation: {
							select: {
								equity: {
									select: {
										projectId: true,
									},
								},
							},
						},
						createdAt: true,
						executedAt: true,
					},
				}),
			]);

			const maxReportByProject = toMaxDateMap(
				reports,
				(item) => item.projectId,
				(item) => item.publishedAt,
			);
			const maxVacancyByTeam = toMaxDateMap(
				vacancies,
				(item) => item.teamId,
				(item) => item.updatedAt,
			);
			const maxTeamMemberByTeam = toMaxDateMap(
				teamMembers,
				(item) => item.teamId,
				(item) => item.updatedAt,
			);
			const maxTeamInvestorByTeam = toMaxDateMap(
				teamInvestors,
				(item) => item.teamId,
				(item) => item.updatedAt,
			);
			const maxProjectEquityByProject = toMaxDateMap(
				projectEquities,
				(item) => item.projectId,
				(item) => item.updatedAt,
			);
			const maxWorkflowByProject = toMaxDateMap(
				workflowUpdates,
				(item) => item.projectId,
				(item) => item.updatedAt,
			);
			const maxWorkflowStepByProject = toMaxDateMap(
				workflowStepUpdates,
				(item) => item.projectWorkflow.projectId,
				(item) => item.updatedAt,
			);
			const maxEquityAllocationByProject = toMaxDateMap(
				equityAllocations,
				(item) => item.equity.projectId,
				(item) => item.updatedAt,
			);
			const workflowByProjectId = new Map(
				workflows.map((workflow) => [workflow.projectId, workflow]),
			);
			const maxEquityPromiseByProject = toMaxDateMap(
				equityPromises,
				(item) => item.allocation.equity.projectId,
				(item) => item.executedAt ?? item.createdAt,
			);

			const dormantProjectIds: string[] = [];
			const archivedProjectIds: string[] = [];

			for (const project of projects) {
				let lastActivityAt: Date | undefined = project.updatedAt;
				const teamId = project.team?.id;

				lastActivityAt = pickMaxDate(
					lastActivityAt,
					maxReportByProject.get(project.id),
				);
				lastActivityAt = pickMaxDate(
					lastActivityAt,
					teamId ? maxVacancyByTeam.get(teamId) : undefined,
				);
				lastActivityAt = pickMaxDate(
					lastActivityAt,
					teamId ? maxTeamMemberByTeam.get(teamId) : undefined,
				);
				lastActivityAt = pickMaxDate(
					lastActivityAt,
					teamId ? maxTeamInvestorByTeam.get(teamId) : undefined,
				);
				lastActivityAt = pickMaxDate(
					lastActivityAt,
					maxProjectEquityByProject.get(project.id),
				);
				lastActivityAt = pickMaxDate(
					lastActivityAt,
					maxEquityAllocationByProject.get(project.id),
				);
				lastActivityAt = pickMaxDate(
					lastActivityAt,
					maxEquityPromiseByProject.get(project.id),
				);
				lastActivityAt = pickMaxDate(
					lastActivityAt,
					maxWorkflowByProject.get(project.id),
				);
				lastActivityAt = pickMaxDate(
					lastActivityAt,
					maxWorkflowStepByProject.get(project.id),
				);

				if (!lastActivityAt) continue;

				if (
					project.status === ProjectStatus.Approved &&
					!isProjectAvailableOnStores({
						links: project.links,
						workflow: workflowByProjectId.get(project.id),
					}) &&
					lastActivityAt <= dormantThreshold
				) {
					await prisma.project.update({
						where: {
							id: project.id,
							status: ProjectStatus.Approved,
						},
						data: {
							status: ProjectStatus.Dormant,
							dormantAt: now,
							statusChangedAt: now,
						},
					});

					dormantProjectIds.push(project.id);

					try {
						await NovuService.send({
							template: "default-message",
							to: {
								subscriberId: project.authorId,
								email: project.author.email || undefined,
							},
							payload: {
								title: "Project status changed to Dormant",
								message:
									`Your project "${project.name}" was moved to Dormant due to inactivity. ` +
									"To restore activity, publish a devlog or make other project updates. " +
									`If there is no activity in the next ${ARCHIVE_AFTER_DORMANT_DAYS} days, the project will be archived.`,
								redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/user/project/${project.slug}`,
							},
						});
					} catch (error) {
						console.error(
							`Failed to send Dormant notification for project ${project.id}`,
							error,
						);
					}

					continue;
				}

				if (project.status === ProjectStatus.Dormant) {
					const dormantSince = project.dormantAt;
					if (!dormantSince) continue;

					const archiveAt = dayjs(dormantSince)
						.add(ARCHIVE_AFTER_DORMANT_DAYS, "day")
						.toDate();
					const hadActivityAfterDormant = lastActivityAt > dormantSince;

					if (!hadActivityAfterDormant && now >= archiveAt) {
						await prisma.project.update({
							where: {
								id: project.id,
								status: ProjectStatus.Dormant,
							},
							data: {
								status: ProjectStatus.Archived,
								archivedAt: now,
								statusChangedAt: now,
							},
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
				archivedProjectIds,
			};
		},
	);

	return json(result ?? null);
});
