import { json, pipe, withAuth } from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { prisma } from "@/services/prisma";

/**
 * A template's state is read off the data, not stored.
 *
 * `WorkflowSchema` has no status column and its schema lives in the external
 * prisma package, so the list derives what it can: a template with no steps
 * cannot run anything, and one no project has picked up is not in use yet.
 */
export type WorkflowTemplateStatus = "draft" | "active" | "unused";

function templateStatus(steps: number, usedBy: number): WorkflowTemplateStatus {
	if (steps === 0) return "draft";
	return usedBy > 0 ? "active" : "unused";
}

export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.workflow.view" }),
)(async () => {
	const [templates, usage] = await Promise.all([
		prisma.workflowSchema.findMany({ orderBy: { updatedAt: "desc" } }),
		prisma.projectWorkflow.groupBy({
			by: ["workflowSchemaId"],
			_count: { _all: true },
		}),
	]);

	const usedByCount = new Map(
		usage.map((row) => [row.workflowSchemaId, row._count._all]),
	);

	return json(
		templates.map((template) => {
			const steps = template.steps as PrismaJson.WorkflowStep[];
			const stepCount = steps.length;
			const taskCount = steps.reduce(
				(total, step) => total + (step.tasks?.length ?? 0),
				0,
			);
			const usedBy = usedByCount.get(template.id) ?? 0;

			return {
				id: template.id,
				name: template.name,
				title: template.title,
				description: template.description,
				updatedAt: template.updatedAt,
				createdAt: template.createdAt,
				stepCount,
				taskCount,
				usedBy,
				status: templateStatus(stepCount, usedBy),
			};
		}),
	);
});
