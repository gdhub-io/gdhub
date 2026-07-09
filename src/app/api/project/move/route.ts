import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";
import { recomputeStepTasks } from "@/services/workflow/recomputeStepTasks";

const ProjectMoveSchema = z.object({
	projectId: z.string(),
	direction: z.enum(["next", "previous"]),
	targetStepId: z.string().optional(),
});

type ProjectMoveBody = z.infer<typeof ProjectMoveSchema>;

export const PUT = withAuth({
	mode: "user",
	roles: [prismaClient.UserRole.Author],
})(
	withValidation(ProjectMoveSchema)(async (_req, _ctx, { user, body }) => {
		const { projectId, direction, targetStepId } = body as ProjectMoveBody;
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();

		const project = await prisma.project.findFirst({
			where: { id: projectId },
			select: {
				workflow: {
					include: {
						currentStep: {
							include: {
								tasks: true,
								equityPromises: {
									where: { isExecuted: false },
									include: { allocation: { include: { owner: true } } },
								},
							},
						},
						steps: { include: { tasks: true } },
					},
				},
			},
		});

		if (!project) return apiError.notFound("Project not found");

		const currentStep = project.workflow?.currentStep;

		if (direction) {
			let changedStep:
				| (prismaClient.ProjectWorkflowStep & {
						tasks: prismaClient.ProjectWorkflowTask[];
				  })
				| undefined;

			if (!currentStep) return apiError.badRequest("Current step not found");

			if (direction === "next") {
				// Gate: all required tasks of the current step must be done.
				// Recompute completion from project data first (server-authoritative).
				const currentTasks = await recomputeStepTasks(
					currentStep.tasks ?? [],
					projectId,
					currentStep.id,
				);
				const hasPendingRequiredTasks = currentTasks.some(
					(task) => task.required && !task.done,
				);
				if (hasPendingRequiredTasks) {
					return apiError.badRequest(
						"Complete all required tasks before moving to the next step",
					);
				}

				changedStep = project.workflow?.steps.find(
					(step: { order: number }) =>
						step.order === (currentStep?.order || 0) + 1,
				);
			}

			if (direction === "previous" && currentStep?.order > 0) {
				changedStep = project.workflow?.steps.find(
					(step: { order: number }) =>
						step.order === (currentStep?.order || 0) - 1,
				);
			}

			if (changedStep) {
				await prisma.projectWorkflow.update({
					where: { projectId },
					data: { currentStepId: changedStep.id },
				});

				// set step date if it's not set
				if (!changedStep?.plannedAt && direction === "next") {
					await prisma.projectWorkflowStep.update({
						where: { id: changedStep.id },
						data: { plannedAt: new Date() },
					});
				}

				// Transfer equity promises to allocations
				if (direction === "next" && currentStep.equityPromises) {
					for (const promise of currentStep.equityPromises) {
						// Update allocation percentage
						await prisma.equityAllocation.update({
							where: { id: promise.allocation.id },
							data: {
								percentage: promise.allocation.percentage + promise.percentage,
							},
						});

						// Mark promise as executed
						await prisma.equityPromise.update({
							where: { id: promise.id },
							data: { isExecuted: true, executedAt: new Date() },
						});

						await prisma.equityTransaction.create({
							data: {
								percentage: promise.percentage,
								reason: `Realized equity promise from step ${currentStep.name}`,
								transactionType: prismaClient.EquityTransactionType.Vesting,
								fromAllocation: { connect: { id: promise.allocation.id } },
								toAllocation: { connect: { id: promise.allocation.id } },
								promise: { connect: { id: promise.id } },
								createdBy: { connect: { id: currentUser.id } },
							},
						});
					}
				}
			}
		}

		if (targetStepId) {
			const targetStep = await prisma.projectWorkflowStep.findFirst({
				where: { id: targetStepId },
			});

			if (targetStep) {
				// set step as current step
				await prisma.projectWorkflow.update({
					where: { projectId },
					data: { currentStepId: targetStep.id },
				});

				// set step date if it's not set and current step is after target step
				if (
					!targetStep?.plannedAt &&
					currentStep?.order &&
					currentStep?.order > targetStep?.order
				) {
					await prisma.projectWorkflowStep.update({
						where: { id: targetStepId },
						data: { plannedAt: new Date() },
					});
				}
			}
		}

		return json(null);
	}),
);
