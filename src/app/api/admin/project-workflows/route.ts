import { json, pipe, withAuth } from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { prisma } from "@/services/prisma";
import { isModifiedFromTemplate } from "@/services/workflow/compareToTemplate";

/**
 * Every project's workflow, with the facts the admin list is scanned for:
 * where the project stands, how much of it is done, and whether it still looks
 * like the template it came from.
 */
export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.workflow.view" }),
)(async () => {
	const workflows = await prisma.projectWorkflow.findMany({
		include: {
			project: {
				select: {
					id: true,
					name: true,
					slug: true,
					status: true,
					author: { select: { name: true } },
				},
			},
			schema: { select: { id: true, name: true, title: true, steps: true } },
			currentStep: { select: { id: true, name: true, order: true } },
			steps: {
				select: {
					id: true,
					name: true,
					order: true,
					updatedAt: true,
					tasks: {
						select: { name: true, done: true },
						orderBy: { order: "asc" },
					},
				},
				orderBy: { order: "asc" },
			},
		},
		orderBy: { updatedAt: "desc" },
	});

	return json(
		workflows.map((workflow) => {
			const tasks = workflow.steps.flatMap((step) => step.tasks);
			const done = tasks.filter((task) => task.done).length;

			// The step's own position, not the stored `order`, which can hold gaps.
			const stageIndex = workflow.currentStep
				? workflow.steps.findIndex(
						(step) => step.id === workflow.currentStep?.id,
					) + 1
				: 0;

			// A workflow is only as fresh as its most recent step.
			const lastActivityAt = workflow.steps.reduce<Date>(
				(latest, step) => (step.updatedAt > latest ? step.updatedAt : latest),
				workflow.updatedAt,
			);

			return {
				id: workflow.id,
				project: {
					id: workflow.project.id,
					name: workflow.project.name,
					slug: workflow.project.slug,
					status: workflow.project.status,
					authorName: workflow.project.author?.name ?? null,
				},
				template: workflow.schema
					? {
							id: workflow.schema.id,
							name: workflow.schema.name,
							title: workflow.schema.title,
						}
					: null,
				isModified: isModifiedFromTemplate(
					workflow.steps,
					(workflow.schema?.steps ?? []) as PrismaJson.WorkflowStep[],
				),
				stage: {
					name: workflow.currentStep?.name ?? null,
					index: stageIndex,
					total: workflow.steps.length,
				},
				progress: {
					done,
					total: tasks.length,
					percent: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
				},
				startedAt: workflow.createdAt,
				lastActivityAt,
			};
		}),
	);
});
