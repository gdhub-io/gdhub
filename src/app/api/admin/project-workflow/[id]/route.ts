import { Prisma } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { runningCheckpointLock } from "@/repositories/checkpoint-guards";
import {
	stepName,
	taskName,
	WorkflowStepsInputSchema,
	type WorkflowTaskInput,
} from "@/schemas/workflow";
import { prisma } from "@/services/prisma";
import { diffFromTemplate } from "@/services/workflow/diffFromTemplate";
import {
	planSteps,
	planTasks,
	resolveCurrentStepId,
} from "@/services/workflow/reconcile";

/** Validate an incoming task condition; `DbNull` clears it. */
function taskCondition(raw: WorkflowTaskInput["condition"]) {
	return raw == null ? Prisma.DbNull : raw;
}

const UpdateProjectWorkflowSchema = z.object({
	title: z.string().optional(),
	steps: WorkflowStepsInputSchema.optional(),
	currentStepId: z.string().nullish(),
});

type UpdateProjectWorkflowBody = z.infer<typeof UpdateProjectWorkflowSchema>;

export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.workflow.view" }),
)(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { id } = (await ctx.params) as { id: string };

	const projectWorkflow = await prisma.projectWorkflow.findUnique({
		where: { id },
		include: {
			project: {
				select: {
					id: true,
					name: true,
					slug: true,
					author: { select: { name: true } },
				},
			},
			schema: {
				select: {
					id: true,
					name: true,
					title: true,
					steps: true,
					updatedAt: true,
				},
			},
			currentStep: { select: { id: true, name: true, order: true } },
			steps: {
				include: { tasks: { orderBy: { order: "asc" } } },
				orderBy: { order: "asc" },
			},
		},
	});

	if (!projectWorkflow) {
		return json(null);
	}

	const templateSteps = (projectWorkflow.schema?.steps ??
		[]) as PrismaJson.WorkflowStep[];

	const totalTasks = projectWorkflow.steps.reduce(
		(total, step) => total + step.tasks.length,
		0,
	);
	const completedTasks = projectWorkflow.steps.reduce(
		(total, step) => total + step.tasks.filter((task) => task.done).length,
		0,
	);
	const completionPercentage =
		totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

	const daysInProgress = Math.floor(
		(Date.now() - new Date(projectWorkflow.createdAt).getTime()) /
			(1000 * 60 * 60 * 24),
	);

	return json({
		...projectWorkflow,
		template: projectWorkflow.schema
			? {
					id: projectWorkflow.schema.id,
					name: projectWorkflow.schema.name,
					title: projectWorkflow.schema.title,
					updatedAt: projectWorkflow.schema.updatedAt,
					// The editor marks each step and task that the template does not
					// have, which it can only do against the template itself.
					steps: templateSteps,
				}
			: null,
		// What this project changed about its copy — the cost of a reset, stated
		// before anyone offers one.
		localChanges: diffFromTemplate(projectWorkflow.steps, templateSteps),
		analytics: {
			totalTasks,
			completedTasks,
			completionPercentage,
			daysInProgress,
			currentStepName: projectWorkflow.currentStep?.name || "Not started",
			currentStepOrder: projectWorkflow.currentStep?.order || 0,
			totalSteps: projectWorkflow.steps.length,
		},
	});
});

/**
 * Rewrite a project's workflow from what the editor sends back.
 *
 * Everything happens inside one transaction. The previous version wrote step by
 * step outside a transaction and read an empty `steps` array as "delete them
 * all" — a form that had not finished loading was enough to leave a project
 * with no workflow, and a failure halfway through left it half-deleted. The
 * schema now refuses an empty list, and the diff is computed before anything is
 * written (see `services/workflow/reconcile`, covered by tests).
 */
export const PUT = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.workflow.manage" }),
	withValidation(UpdateProjectWorkflowSchema),
)(async (_req, ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { id } = (await ctx.params) as { id: string };
	const { title, steps, currentStepId } = body as UpdateProjectWorkflowBody;

	const existing = await prisma.projectWorkflow.findUnique({
		where: { id },
		select: {
			id: true,
			projectId: true,
			currentStepId: true,
			steps: {
				select: { id: true, tasks: { select: { id: true } } },
				orderBy: { order: "asc" },
			},
		},
	});

	if (!existing) return apiError.notFound("Project workflow not found");

	const plan = steps && planSteps(steps, existing.steps);
	if (plan?.deleteIds.length) {
		const lock = await runningCheckpointLock(existing.projectId);
		if (lock) return apiError.conflict("checkpointRunning", lock);
	}

	const updated = await prisma.$transaction(async (tx) => {
		let survivingIds = existing.steps.map((step) => step.id);

		if (plan) {
			const tasksByStepId = new Map(
				existing.steps.map((step) => [step.id, step.tasks]),
			);
			survivingIds = [];

			for (const { id: stepId, order, input } of plan.update) {
				await tx.projectWorkflowStep.update({
					where: { id: stepId },
					data: {
						name: stepName(input) ?? undefined,
						description: input.description ?? undefined,
						order,
					},
				});
				survivingIds.push(stepId);

				if (input.tasks) {
					await applyTaskPlan(
						tx,
						stepId,
						planTasks(input.tasks, tasksByStepId.get(stepId) ?? []),
					);
				}
			}

			for (const { order, input } of plan.create) {
				const created = await tx.projectWorkflowStep.create({
					data: {
						name: stepName(input) ?? "Untitled step",
						description: input.description ?? "",
						order,
						projectWorkflowId: id,
					},
				});
				survivingIds.push(created.id);

				if (input.tasks?.length) {
					await applyTaskPlan(tx, created.id, planTasks(input.tasks, []));
				}
			}

			// The pointer moves off a doomed step before the step goes, so the
			// foreign key is never left aimed at a deleted row.
			if (plan.deleteIds.length) {
				const nextCurrent = resolveCurrentStepId(
					currentStepId,
					survivingIds,
					existing.currentStepId,
				);
				await tx.projectWorkflow.update({
					where: { id },
					data: { currentStepId: nextCurrent },
				});
				await tx.projectWorkflowStep.deleteMany({
					where: { id: { in: plan.deleteIds } },
				});
			}
		}

		return tx.projectWorkflow.update({
			where: { id },
			data: {
				...(title !== undefined ? { title } : null),
				...(currentStepId !== undefined
					? {
							currentStepId: resolveCurrentStepId(
								currentStepId,
								survivingIds,
								existing.currentStepId,
							),
						}
					: null),
			},
		});
	});

	return json(updated);
});

/** The extended client's own transaction type — `Prisma.TransactionClient`
 *  describes the unextended one and does not match what `$transaction` hands us. */
type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function applyTaskPlan(
	tx: Tx,
	stepId: string,
	plan: ReturnType<typeof planTasks>,
) {
	for (const { id, order, input } of plan.update) {
		await tx.projectWorkflowTask.update({
			where: { id },
			data: {
				name: taskName(input),
				description: input.description ?? null,
				required: Boolean(input.required),
				done: Boolean(input.done),
				order,
				condition: taskCondition(input.condition),
			},
		});
	}

	for (const { order, input } of plan.create) {
		await tx.projectWorkflowTask.create({
			data: {
				name: taskName(input),
				description: input.description ?? null,
				required: Boolean(input.required),
				done: Boolean(input.done),
				order,
				stepId,
				condition: taskCondition(input.condition),
			},
		});
	}

	if (plan.deleteIds.length) {
		await tx.projectWorkflowTask.deleteMany({
			where: { id: { in: plan.deleteIds } },
		});
	}
}

export const DELETE = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.workflow.manage" }),
)(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { id } = (await ctx.params) as { id: string };

	await prisma.projectWorkflow.delete({ where: { id } });

	return json({ success: true });
});
