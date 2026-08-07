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
import { WorkflowStepsTemplateSchema } from "@/schemas/workflow";
import { prisma } from "@/services/prisma";
import { planReset, type ResetPlan } from "@/services/workflow/planReset";

const ResetSchema = z.object({
	mode: z.enum(["keep", "sync", "full"]),
	/** Omitted keeps the project on the template it already follows. */
	templateId: z.string().optional(),
	/** Ask what would happen instead of making it happen. */
	dryRun: z.boolean().optional(),
});

type ResetBody = z.infer<typeof ResetSchema>;

/**
 * Put a project's workflow back in step with a template.
 *
 * The same request answers "what would this do?" and "do it", from one plan
 * computed the same way (see `services/workflow/planReset`, covered by tests) —
 * so the preview an admin confirms is not a second implementation that can drift
 * from the writes. Everything lands inside one transaction.
 */
export const POST = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.workflow.manage" }),
	withValidation(ResetSchema),
)(async (_req, ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { id } = (await ctx.params) as { id: string };
	const { mode, templateId, dryRun } = body as ResetBody;

	const workflow = await prisma.projectWorkflow.findUnique({
		where: { id },
		select: {
			id: true,
			workflowSchemaId: true,
			currentStepId: true,
			steps: {
				select: {
					id: true,
					name: true,
					tasks: {
						select: { id: true, name: true, done: true },
						orderBy: { order: "asc" },
					},
				},
				orderBy: { order: "asc" },
			},
		},
	});

	if (!workflow) return apiError.notFound("Project workflow not found");

	const schemaId = templateId ?? workflow.workflowSchemaId;
	if (!schemaId) {
		return apiError.badRequest("This project is not linked to a template");
	}

	const template = await prisma.workflowSchema.findUnique({
		where: { id: schemaId },
		select: { id: true, name: true, title: true, steps: true },
	});
	if (!template) return apiError.notFound("Template not found");

	// A template that no longer parses would otherwise be applied as an empty
	// flow — exactly the wipe this whole path exists to prevent.
	const parsed = WorkflowStepsTemplateSchema.safeParse(template.steps);
	if (!parsed.success) {
		return apiError.badRequest("The template has no usable steps");
	}

	const plan = planReset(
		workflow.steps,
		parsed.data,
		mode,
		workflow.currentStepId,
	);

	if (dryRun) {
		return json({
			template: { id: template.id, name: template.name, title: template.title },
			summary: plan.summary,
		});
	}

	await prisma.$transaction(async (tx) => {
		const survivingStepIds = await applyPlan(tx, id, plan);

		// The pointer moves before the rows it could point at are deleted.
		const nextCurrentId = plan.summary.currentStep.kept
			? workflow.currentStepId
			: (survivingStepIds[0] ?? null);

		await tx.projectWorkflow.update({
			where: { id },
			data: { currentStepId: nextCurrentId, workflowSchemaId: schemaId },
		});

		if (plan.removedStepIds.length) {
			await tx.projectWorkflowStep.deleteMany({
				where: { id: { in: plan.removedStepIds } },
			});
		}
	});

	return json({ success: true, summary: plan.summary });
});

/** The extended client's own transaction type — `Prisma.TransactionClient`
 *  describes the unextended one and does not match what `$transaction` hands us. */
type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/** Writes the plan and returns the step ids that survive it, in order. */
async function applyPlan(
	tx: Tx,
	workflowId: string,
	plan: ResetPlan,
): Promise<string[]> {
	const survivingStepIds: string[] = [];

	for (const [index, step] of plan.steps.entries()) {
		let stepId = step.id;

		// A step is finished when its tasks are, so clearing progress has to clear
		// the flag too — otherwise a step stays marked done with nothing done in it.
		const done = step.tasks.length > 0 && step.tasks.every((task) => task.done);
		const stepData = {
			name: step.name,
			description: step.description ?? "",
			order: index,
			done,
			...(done ? null : { finishedAt: null }),
		};

		if (stepId) {
			await tx.projectWorkflowStep.update({
				where: { id: stepId },
				data: stepData,
			});
		} else {
			const created = await tx.projectWorkflowStep.create({
				data: { ...stepData, projectWorkflowId: workflowId },
			});
			stepId = created.id;
		}

		survivingStepIds.push(stepId);

		const keptTaskIds: string[] = [];
		for (const [taskIndex, task] of step.tasks.entries()) {
			const data = {
				name: task.name,
				description: task.description ?? null,
				required: task.required,
				done: task.done,
				order: taskIndex,
				condition: task.condition ?? Prisma.DbNull,
				...(task.done ? null : { finishedAt: null }),
			};

			if (task.id) {
				await tx.projectWorkflowTask.update({ where: { id: task.id }, data });
				keptTaskIds.push(task.id);
			} else {
				await tx.projectWorkflowTask.create({ data: { ...data, stepId } });
			}
		}

		// Whatever the step still holds and the plan does not name is gone. On a
		// sync the plan carries every existing task, so this deletes nothing.
		await tx.projectWorkflowTask.deleteMany({
			where: { stepId, id: { notIn: keptTaskIds } },
		});
	}

	return survivingStepIds;
}
