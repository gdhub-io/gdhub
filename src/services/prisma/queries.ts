import type { ProjectLink } from "@/types/project";
import { prisma } from ".";

export const MINIMUM_STORE_STAGE_NAME = "Preparing a demo version";
export const ALLOWED_STORE_PLATFORMS = new Set([
	"steam",
	"itch-io",
	"epic-store",
	"google-play",
	"app-store",
]);

type StoreWorkflow = {
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

export const getStoreLinks = (links: unknown): ProjectLink[] => {
	const projectLinks = Array.isArray(links) ? (links as ProjectLink[]) : [];

	return projectLinks.filter(
		(link) =>
			ALLOWED_STORE_PLATFORMS.has(link.platform) && Boolean(link.link?.trim()),
	);
};

export const isProjectAvailableOnStores = ({
	links,
	workflow,
}: {
	links: unknown;
	workflow?: StoreWorkflow | null;
}) => {
	const storeLinks = getStoreLinks(links);
	const minimumStep = workflow?.steps.find(
		(step) => step.name === MINIMUM_STORE_STAGE_NAME,
	);

	if (!storeLinks.length || !workflow?.currentStep || !minimumStep) {
		return false;
	}

	const currentStep = workflow.currentStep;

	return currentStep.order >= minimumStep.order;
};

export const getWorkedProjects = async () => {
	const projects = await prisma.project.getProjectsOrderedByActivity({
		order: "desc",
	});
	const teamIds = projects.map((project) => project.teamId);
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
		projects.map(async (project) => ({
			...project,
			applauseCount: await prisma.project.getApplauseCount({
				projectId: project.id,
			}),
			hasOpenPositions: teamIdsWithOpenPositions.has(project.teamId),
		})),
	);
};

export const getPublishedStoreProjects = async () => {
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
			},
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
				hasOpenPositions: teamIdsWithOpenPositions.has(project.teamId),
				storeLinks,
				workflow: {
					currentStep: {
						name: currentStep.name,
						order: currentStep.order,
					},
				},
			};
		}),
	).then((items) => items.filter((project) => project !== null));
};
