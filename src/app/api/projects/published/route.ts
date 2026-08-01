import { apiError, json, withAuth } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";
import {
	getStoreLinks,
	isProjectAvailableOnStores,
	MINIMUM_STORE_STAGE_ORDER,
} from "@/services/prisma/queries";

type WorkflowWithCurrentStep = {
	currentStep: {
		name: string;
		order: number;
	} | null;
};

export const GET = withAuth({ mode: "user" })(async () => {
	try {
		const projects = await prisma.project.getProjectsOrderedByActivity({
			order: "desc",
			where: {
				workflow: {
					is: {
						currentStep: {
							is: { order: { gte: MINIMUM_STORE_STAGE_ORDER } },
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
				} satisfies WorkflowWithCurrentStep,
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

		// Filter and cut to the page size *before* counting applause, so the
		// counter query only touches the projects that are actually returned.
		const eligible = projects
			.flatMap((project) => {
				const workflow = workflowByProjectId.get(project.id);

				if (!isProjectAvailableOnStores({ links: project.links, workflow })) {
					return [];
				}

				const currentStep = workflow?.currentStep;

				return currentStep ? [{ project, currentStep }] : [];
			})
			.slice(0, 4);

		const applauseCounts = await prisma.project.getApplauseCounts({
			projectIds: eligible.map(({ project }) => project.id),
		});

		const result = eligible.map(({ project, currentStep }) => ({
			id: project.id,
			name: project.name,
			slug: project.slug,
			description: project.description,
			genre: project.genre,
			platform: project.platform,
			coverImage: project.coverImage,
			applauseCount: applauseCounts.get(project.id) ?? 0,
			hasOpenPositions: projectIdsWithOpenPositions.has(project.id),
			storeLinks: getStoreLinks(project.links),
			workflow: {
				currentStep: {
					name: currentStep.name,
					order: currentStep.order,
				},
			},
		}));

		return json(result);
	} catch (error) {
		console.error("[projects: published: list: error]", error);
		return apiError.badRequest("Failed to get published projects");
	}
});
