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
import { projectOfEquityPromise } from "@/lib/space-ids";
import { ProjectEquityRepository } from "@/repositories/project-equity.repository";
import { prisma } from "@/services/prisma";

const CreateMemberShareSchema = z.object({
	projectId: z.string().min(1),
	memberId: z.string().min(1),
	percentage: z.number().min(0),
	targetStepId: z.string().optional(),
});

const UpdateMemberShareSchema = z.object({
	promiseId: z.string().min(1),
	percentage: z.number().min(0),
	targetStepId: z.string().optional(),
});

const DeleteMemberShareQuerySchema = z.object({
	promiseId: z.string().min(1),
});

type CreateMemberShareBody = z.infer<typeof CreateMemberShareSchema>;
type UpdateMemberShareBody = z.infer<typeof UpdateMemberShareSchema>;
type DeleteMemberShareQuery = z.infer<typeof DeleteMemberShareQuerySchema>;

export const POST = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "project.equity.manage",
		idFrom: "body.projectId",
	}),
	withValidation(CreateMemberShareSchema),
)(async (_req, _ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { projectId, memberId, percentage, targetStepId } =
		body as CreateMemberShareBody;

	if (!targetStepId) {
		return apiError.badRequest("Target step ID is required");
	}

	const project = await prisma.project.findUnique({
		where: { id: projectId },
		include: {
			team: {
				include: { members: true },
			},
		},
	});

	if (!project) {
		return apiError.notFound("Project not found");
	}

	if (project.authorId !== currentUser.id) {
		return apiError.forbidden(
			"You do not have permission to update the member shares",
		);
	}

	const workflow = await prisma.projectWorkflow.findFirst({
		where: { projectId },
		include: { currentStep: true },
	});

	let vested = true;
	if (targetStepId && workflow?.currentStep) {
		const targetStep = await prisma.projectWorkflowStep.findUnique({
			where: { id: targetStepId },
		});

		if (targetStep && workflow.currentStep.order < targetStep.order) {
			vested = false;
		}
	}
	void vested;

	const equity = await ProjectEquityRepository.getProjectEquity(projectId);

	let memberShare = await ProjectEquityRepository.getMemberShare(
		projectId,
		memberId,
	);

	if (!memberShare || targetStepId) {
		memberShare = await ProjectEquityRepository.createMemberShare({
			projectId,
			memberId,
			percentage,
			targetStepId,
			createdById: currentUser.id,
		});
	}

	const totalTeamShares = equity.equityAllocations.reduce(
		(sum: number, share: { percentage: number }) => sum + share.percentage,
		0,
	);
	const totalAllocation =
		equity.platformShare +
		equity.mentorFundShare +
		equity.investmentReserve +
		totalTeamShares;

	if (totalAllocation > 100) {
		return apiError.badRequest("Total share exceeds 100%");
	}

	return json({ ...memberShare, percentage });
});

export const PUT = pipe(
	withAuth({ mode: "user" }),
	// Without this guard any signed-in user could rewrite anyone's promised
	// equity by passing a promise id — the handler did not even read the caller.
	withSpaceGuard({
		permission: "project.equity.manage",
		idFrom: projectOfEquityPromise,
	}),
	withValidation(UpdateMemberShareSchema),
)(async (_req, _ctx, { body }) => {
	const { promiseId, percentage, targetStepId } = body as UpdateMemberShareBody;

	const updated = await prisma.equityPromise.update({
		where: { id: promiseId },
		data: { percentage, targetStepId },
	});

	return json(updated);
});

export const DELETE = pipe(
	withAuth({ mode: "user" }),
	// Same hole as PUT: deleting somebody else's equity promise took nothing but
	// its id.
	withSpaceGuard({
		permission: "project.equity.manage",
		idFrom: projectOfEquityPromise,
	}),
	withValidation(DeleteMemberShareQuerySchema, "query"),
)(async (_req, _ctx, { body }) => {
	const { promiseId } = body as DeleteMemberShareQuery;

	const deleted = await prisma.equityPromise.delete({
		where: { id: promiseId },
	});

	return json(deleted);
});
