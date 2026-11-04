import {
	STORE_LINK_PLATFORMS,
	type WorkflowTaskCondition,
} from "@/schemas/workflowTaskCondition";
import { prisma } from "@/services/prisma";
import type { ProjectLink } from "@/types/project";

export type TaskConditionContext = {
	projectId: string;
	/** Current workflow step id; used by step-scoped conditions. */
	stepId?: string | null;
};

function isFilled(value: unknown): boolean {
	if (value == null) return false;
	if (typeof value === "string") return value.trim().length > 0;
	if (Array.isArray(value)) return value.length > 0;
	return true;
}

/** Relation filter scoping a team-owned model to the project. */
const teamScope = (projectId: string) => ({ team: { projectId } });

/**
 * Evaluate a single task condition against the current project data.
 * Returns `true` when the task should be considered done.
 */
export async function evaluateTaskCondition(
	condition: WorkflowTaskCondition,
	ctx: TaskConditionContext,
): Promise<boolean> {
	const { projectId } = ctx;

	switch (condition.source) {
		case "project_fields": {
			const project = await prisma.project.findUnique({
				where: { id: projectId },
			});
			if (!project) return false;
			const record = project as Record<string, unknown>;
			return condition.fields.every((field) => isFilled(record[field]));
		}

		case "devlog_posts": {
			const stepFilter =
				condition.scope === "step" && ctx.stepId ? { stepId: ctx.stepId } : {};
			const count = await prisma.projectReport.count({
				where: { projectId, ...stepFilter },
			});
			return count >= condition.min;
		}

		case "vacancies": {
			const stepFilter =
				condition.scope === "step" && ctx.stepId
					? { promiseStepId: ctx.stepId }
					: {};
			const count = await prisma.teamVacancy.count({
				where: {
					...teamScope(projectId),
					...stepFilter,
					...(condition.status ? { status: condition.status } : {}),
					...(condition.directionId
						? { directionId: condition.directionId }
						: {}),
				},
			});
			return count >= condition.min;
		}

		case "team_members": {
			const stepFilter =
				condition.scope === "step" && ctx.stepId
					? { enteredProjectStepId: ctx.stepId }
					: {};
			const count = await prisma.teamMember.count({
				where: {
					...teamScope(projectId),
					...stepFilter,
					...(condition.status ? { status: condition.status } : {}),
				},
			});
			return count >= condition.min;
		}

		case "investors": {
			const count = await prisma.teamInvestor.count({
				where: teamScope(projectId),
			});
			return count >= condition.min;
		}

		case "artifacts": {
			const count = await prisma.projectArtifact.count({
				where: {
					projectId,
					...(condition.type ? { type: condition.type } : {}),
				},
			});
			return count >= condition.min;
		}

		case "advice_requests": {
			const count = await prisma.adviceRequest.count({
				where: {
					projectId,
					...(condition.status ? { status: condition.status } : {}),
				},
			});
			return count >= condition.min;
		}

		case "estimations": {
			const count = await prisma.projectEstimation.count({
				where: { projectId },
			});
			return count >= condition.min;
		}

		case "equity_allocations": {
			const count = await prisma.equityAllocation.count({
				where: { equity: { projectId } },
			});
			return count >= condition.min;
		}

		case "applause": {
			const count = await prisma.applauseActivity.count({
				where: {
					projectId,
					...(condition.type ? { type: condition.type } : {}),
				},
			});
			return count >= condition.min;
		}

		case "links": {
			const project = await prisma.project.findUnique({
				where: { id: projectId },
				select: { links: true },
			});
			const links = (project?.links ?? []) as ProjectLink[];
			const counted = condition.kind
				? links.filter((link) =>
						(STORE_LINK_PLATFORMS as readonly string[]).includes(link.platform),
					)
				: links;
			return counted.length >= condition.min;
		}
	}
}
