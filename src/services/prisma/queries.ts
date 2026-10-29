import { getProjectCardFacts } from "@/repositories/project/card";
import type { ProjectActivityRow, ProjectLink } from "@/types/project";
import { prisma } from ".";

/**
 * Stage positions in the workflow template (`ProjectWorkflowStep.order`).
 * Stage checks are bound to the position, not to the name, so renaming
 * a stage in the template does not break them.
 */
export const WorkflowStageOrder = {
	Introduction: 0,
	Ideation: 1,
	Concepting: 2,
	Prototyping: 3,
	DemoVersion: 4,
	Metrics: 5,
	ReleaseVersion: 6,
	Support: 7,
	Completion: 8,
} as const;

export const MINIMUM_FEED_STAGE_ORDER = WorkflowStageOrder.Ideation;
export const MINIMUM_STORE_STAGE_ORDER = WorkflowStageOrder.DemoVersion;

export const feedVisibleProjectFilter = {
	workflow: {
		is: {
			currentStep: {
				is: { order: { gte: MINIMUM_FEED_STAGE_ORDER } },
			},
		},
	},
} as const;

export const ALLOWED_STORE_PLATFORMS = new Set([
	"steam",
	"itch-io",
	"epic-store",
	"google-play",
	"app-store",
]);

type StoreWorkflow = {
	currentStep: {
		order: number;
	} | null;
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

	if (!storeLinks.length || !workflow?.currentStep) {
		return false;
	}

	return workflow.currentStep.order >= MINIMUM_STORE_STAGE_ORDER;
};

export const getWorkedProjects = async ({
	stage,
}: {
	/** Only projects whose current workflow step has this name. */
	stage?: string;
} = {}) => {
	const projects = (await prisma.project.getProjectsOrderedByActivity({
		order: "desc",
		where: stage
			? { workflow: { is: { currentStep: { is: { name: stage } } } } }
			: undefined,
	})) as ProjectActivityRow[];
	const projectIds = projects.map((project) => project.id);
	const [projectIdsWithOpenPositions, applauseCounts, cardFacts] =
		await Promise.all([
			projectsWithOpenPositions(projectIds),
			prisma.project.getApplauseCounts({ projectIds }),
			getProjectCardFacts(projectIds),
		]);

	return projects.map((project) => {
		const facts = cardFacts.get(project.id);

		return {
			...project,
			applauseCount: applauseCounts.get(project.id) ?? 0,
			hasOpenPositions: projectIdsWithOpenPositions.has(project.id),
			author: facts?.author ?? null,
			team: facts?.team ?? { count: 0, members: [] },
			stage: facts?.stage ?? null,
		};
	});
};

export const getPublishedStoreProjects = async ({
	limit,
	platform,
}: {
	limit?: number;
	/** Only projects with a link to this storefront. */
	platform?: string;
} = {}) => {
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
		where: { projectId: { in: projectIds } },
		select: {
			projectId: true,
			currentStep: { select: { name: true, order: true } },
		},
	});
	const workflowByProjectId = new Map(
		workflows.map((workflow) => [
			workflow.projectId,
			{ currentStep: workflow.currentStep },
		]),
	);

	// Filter and cut to the page size first, so the per-project queries below
	// only touch the projects that are actually returned.
	const eligible = projects
		.flatMap((project) => {
			const workflow = workflowByProjectId.get(project.id);

			if (!isProjectAvailableOnStores({ links: project.links, workflow })) {
				return [];
			}
			if (
				platform &&
				!getStoreLinks(project.links).some((link) => link.platform === platform)
			) {
				return [];
			}

			const currentStep = workflow?.currentStep;

			return currentStep ? [{ project, currentStep }] : [];
		})
		.slice(0, limit);

	const eligibleIds = eligible.map(({ project }) => project.id);
	const [projectIdsWithOpenPositions, applauseCounts, cardFacts] =
		await Promise.all([
			projectsWithOpenPositions(eligibleIds),
			prisma.project.getApplauseCounts({ projectIds: eligibleIds }),
			getProjectCardFacts(eligibleIds),
		]);

	return eligible.map(({ project, currentStep }) => ({
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
		author: cardFacts.get(project.id)?.author ?? null,
		team: cardFacts.get(project.id)?.team ?? { count: 0, members: [] },
		workflow: {
			currentStep: {
				name: currentStep.name,
				order: currentStep.order,
			},
		},
	}));
};

async function projectsWithOpenPositions(projectIds: string[]) {
	const vacancies = await prisma.teamVacancy.findMany({
		where: {
			team: { project: { id: { in: projectIds } } },
			status: "Published",
		},
		select: { team: { select: { project: { select: { id: true } } } } },
	});

	return new Set(
		vacancies.flatMap((vacancy) =>
			vacancy.team.project?.id ? [vacancy.team.project.id] : [],
		),
	);
}
