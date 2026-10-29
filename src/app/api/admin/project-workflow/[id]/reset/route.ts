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
import { runningCheckpointLock } from "@/repositories/checkpoints/workflow-lock";
import { setCurrentStep } from "@/repositories/project/workflow";
import { WorkflowStepsTemplateSchema } from "@/schemas/workflow";
import { prisma } from "@/services/prisma";
import { applyResetPlan } from "@/services/workflow/applyResetPlan";
import { planReset } from "@/services/workflow/planReset";

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
			projectId: true,
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

	// The dry run says the same, so the dialog can name it before anyone confirms.
	const lock = await runningCheckpointLock(workflow.projectId);
	if (lock) return apiError.conflict("checkpointRunning", lock);

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
		const survivingStepIds = await applyResetPlan(tx, id, plan, Prisma.DbNull);

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

		// Sent back to the start, the stages it leaves behind lose their dates.
		if (nextCurrentId && nextCurrentId !== workflow.currentStepId) {
			await setCurrentStep(tx, id, nextCurrentId, {
				from: workflow.currentStepId,
			});
		}
	});

	return json({ success: true, summary: plan.summary });
});
