import { BadRequestException, createHandler, Get } from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { prisma } from "@/services/prisma";
import type { ProjectLink } from "@/types/project";

const MINIMUM_STAGE_NAME = "Preparing a demo version";
const ALLOWED_STORE_PLATFORMS = new Set([
	"steam",
	"itch-io",
	"epic-store",
	"google-play",
	"app-store",
]);

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

@NextAuthGuard("user")
class ApiPublishedProjectsHandler {
	@Get()
	public async list() {
		try {
			const projects = await prisma.project.getProjectsOrderedByActivity({
				order: "desc",
			});

			const projectIds = projects.map((project) => project.id);
			const teamIds = projects.map((project) => project.teamId);

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
					teamId: {
						in: teamIds,
					},
					status: "Published",
				},
				select: {
					teamId: true,
				},
			});
			const teamIdsWithOpenPositions = new Set(
				publishedVacancies.map((vacancy) => vacancy.teamId),
			);

			return await Promise.all(
				projects.map(async (project) => {
					const links = Array.isArray(project.links)
						? (project.links as ProjectLink[])
						: [];
					const storeLinks = links.filter(
						(link) =>
							ALLOWED_STORE_PLATFORMS.has(link.platform) && Boolean(link.link),
					);
					const workflow = workflowByProjectId.get(project.id);
					const minimumStep = workflow?.steps.find(
						(step) => step.name === MINIMUM_STAGE_NAME,
					);

					if (!storeLinks.length || !workflow?.currentStep || !minimumStep) {
						return null;
					}

					if (workflow.currentStep.order < minimumStep.order) {
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
						hasOpenPositions: teamIdsWithOpenPositions.has(project.teamId),
						storeLinks,
						workflow: {
							currentStep: {
								name: workflow.currentStep.name,
								order: workflow.currentStep.order,
							},
						},
					};
				}),
			).then((items) => items.filter((project) => project !== null));
		} catch (error) {
			console.error("[projects: published: list: error]", error);
			throw new BadRequestException("Failed to get published projects");
		}
	}
}

export default createHandler(ApiPublishedProjectsHandler);
