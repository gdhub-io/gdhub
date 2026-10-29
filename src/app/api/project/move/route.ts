import { EquityTransactionType } from "@gdhub-io/gdhub-prisma";
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
import {
	runningCheckpointLock,
	stageMoveApproved,
} from "@/repositories/checkpoints/workflow-lock";
import { setCurrentStep } from "@/repositories/project/workflow";
import { prisma } from "@/services/prisma";
import { recomputeStepTasks } from "@/services/workflow/recomputeStepTasks";

// The path runs one way, one stage at a time (GDHUB-37): no going back, no jumps.
const ProjectMoveSchema = z.object({
	projectId: z.string(),
	direction: z.literal("next"),
});

type ProjectMoveBody = z.infer<typeof ProjectMoveSchema>;

// Used to be `withAuth({ roles: [Author] })`, which let anyone who authored any
// project move any other project's workflow.
export const PUT = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "project.workflow.edit",
		idFrom: "body.projectId",
	}),
	withValidation(ProjectMoveSchema),
)(async (_req, _ctx, { user, body }) => {
	const { projectId } = body as ProjectMoveBody;
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	// A running checkpoint holds its stage until its verdict.
	const lock = await runningCheckpointLock(projectId);
	if (lock) return apiError.conflict("checkpointRunning", lock);

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
					steps: { select: { id: true, order: true, plannedAt: true } },
				},
			},
		},
	});

	if (!project) return apiError.notFound("Project not found");

	const currentStep = project.workflow?.currentStep;
	if (!currentStep) return apiError.badRequest("Current step not found");

	// Gate: all required tasks of the current step must be done.
	// Recompute completion from project data first (server-authoritative).
	const currentTasks = await recomputeStepTasks(
		currentStep.tasks ?? [],
		projectId,
		currentStep.id,
	);
	if (currentTasks.some((task) => task.required && !task.done)) {
		return apiError.badRequest(
			"Complete all required tasks before moving to the next step",
		);
	}
	if (!(await stageMoveApproved(projectId, currentStep.id))) {
		return apiError.conflict("stageNotApproved");
	}

	const nextStep = project.workflow?.steps.find(
		(step) => step.order === currentStep.order + 1,
	);
	if (!nextStep) return json(null);

	await prisma.$transaction((tx) =>
		setCurrentStep(tx, currentStep.projectWorkflowId, nextStep.id, {
			from: currentStep.id,
		}),
	);

	// Transfer equity promises to allocations
	for (const promise of currentStep.equityPromises) {
		await prisma.equityAllocation.update({
			where: { id: promise.allocation.id },
			data: {
				percentage: promise.allocation.percentage + promise.percentage,
			},
		});

		await prisma.equityPromise.update({
			where: { id: promise.id },
			data: { isExecuted: true, executedAt: new Date() },
		});

		await prisma.equityTransaction.create({
			data: {
				percentage: promise.percentage,
				reason: `Realized equity promise from step ${currentStep.name}`,
				transactionType: EquityTransactionType.Vesting,
				fromAllocation: { connect: { id: promise.allocation.id } },
				toAllocation: { connect: { id: promise.allocation.id } },
				promise: { connect: { id: promise.id } },
				createdBy: { connect: { id: currentUser.id } },
			},
		});
	}

	return json(null);
});
