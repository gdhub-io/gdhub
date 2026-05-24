import { apiError, json, withAuth } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";
import {
	getStoreLinks,
	isProjectAvailableOnStores,
	MINIMUM_STORE_STAGE_NAME,
} from "@/services/prisma/queries";

type WorkflowWithSteps = {
	currentStep: {
		id: string;
		name: string;
		order: number;
	} | null;
	steps: {
		id: string;
		name: string;
		order: number;
	}[];
};

export const GET = withAuth({ mode: "user" })(async () => {
	try {
		const projects = await prisma.project.getProjectsOrderedByActivity({
			order: "desc",
			where: {
				workflow: {
					is: {
						currentStep: {
							isNot: null,
						},
						steps: {
							some: {
								name: MINIMUM_STORE_STAGE_NAME,
							},
						},
					},
				},
			},
		});

		const projectIds = projects.map((project) => project.id);

		const workflows = await prisma.projectWorkflow.findMany({
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
		});

		const workflowByProjectId = new Map(
			workflows.map((workflow) => [
				workflow.projectId,
				{
					currentStep: workflow.currentStep,
					steps: workflow.steps,
				} satisfies WorkflowWithSteps,
			]),
		);
		const publishedVacancies = await prisma.teamVacancy.findMany({
			where: {
				team: {
					project: {
						id: {
							in: projectIds,
						},
					},
				},
				status: "Published",
			},
			select: {
				team: {
					select: {
						project: {
							select: {
								id: true,
							},
						},
					},
				},
			},
		});
		const projectIdsWithOpenPositions = new Set(
			publishedVacancies.flatMap((vacancy) =>
				vacancy.team.project?.id ? [vacancy.team.project.id] : [],
			),
		);

		const result = await Promise.all(
			projects.map(async (project) => {
				const storeLinks = getStoreLinks(project.links);
				const workflow = workflowByProjectId.get(project.id);

				if (!isProjectAvailableOnStores({ links: project.links, workflow })) {
					return null;
				}

				const currentStep = workflow?.currentStep;

				if (!currentStep) {
					return null;
				}

				return {
					id: project.id,
					name: project.name,
					slug: project.slug,
					description: project.description,
					genre: project.genre,
					platform: project.platform,
					coverImage: project.coverImage,
					applauseCount: await prisma.project.getApplauseCount({
						projectId: project.id,
					}),
					hasOpenPositions: projectIdsWithOpenPositions.has(project.id),
					storeLinks,
					workflow: {
						currentStep: {
							name: currentStep.name,
							order: currentStep.order,
						},
					},
				};
			}),
		).then((items) => items.filter((project) => project !== null).slice(0, 4));

		return json(result);
	} catch (error) {
		console.error("[projects: published: list: error]", error);
		return apiError.badRequest("Failed to get published projects");
	}
});
