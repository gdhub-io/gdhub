import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { IsEnum, IsOptional, IsString } from "class-validator";
import {
	Body,
	createHandler,
	Put,
	Req,
	ValidationPipe,
} from "next-api-decorators";
import { createProjectLegalEvent } from "@/helpers/legal/projectLegalPersistence";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { prisma } from "@/services/prisma";

class ApiProjectMoveDto {
	@IsString()
	projectId: string;
	@IsEnum(["next", "previous"])
	direction: "next" | "previous";
	@IsString()
	@IsOptional()
	targetStepId?: string;
}

@NextAuthGuard("user", [prismaClient.UserRole.Author])
class ApiProjectMoveHandler {
	@Put()
	public async move(
		@Req() req: NextApiRequestWithUser,
		@Body(ValidationPipe) {
			projectId,
			direction,
			targetStepId,
		}: ApiProjectMoveDto,
	) {
		const project = await prisma.project.findFirst({
			where: { id: projectId },
			select: {
				workflow: {
					include: {
						currentStep: {
							include: {
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

		if (!project) throw new Error("Project not found");

		const currentStep = project.workflow?.currentStep;

		if (direction) {
			let changedStep:
				| (prismaClient.ProjectWorkflowStep & {
						tasks: prismaClient.ProjectWorkflowTask[];
				  })
				| undefined;

			if (!currentStep) throw new Error("Current step not found");

			if (direction === "next") {
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
								createdBy: { connect: { id: req.user.id } },
							},
						});

						await createProjectLegalEvent({
							projectId,
							actorUserId: req.user.id,
							subjectUserId: promise.allocation.owner.id,
							subjectTeamMemberId: promise.allocation.teamMemberId || undefined,
							type: "ShareChanged",
							effectiveAt: new Date(),
							payload: {
								action: "promise_vested",
								promiseId: promise.id,
								percentage: promise.percentage,
								stepId: currentStep.id,
								stepName: currentStep.name,
								allocationId: promise.allocation.id,
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
	}
}

export default createHandler(ApiProjectMoveHandler);
