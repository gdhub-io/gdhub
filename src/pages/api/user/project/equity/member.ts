import {
	IsNotEmpty,
	IsNumber,
	IsOptional,
	IsString,
	Min,
} from "class-validator";
import {
	Body,
	createHandler,
	Delete,
	Post,
	Put,
	Query,
	Req,
	ValidationPipe,
} from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { ProjectEquityRepository } from "@/repositories/project-equity.repository";
import { prisma } from "@/services/prisma";

class CreateMemberShareDto {
	@IsString()
	@IsNotEmpty()
	projectId: string;

	@IsString()
	@IsNotEmpty()
	memberId: string;

	@IsNumber()
	@Min(0)
	percentage: number;

	@IsString()
	@IsOptional()
	targetStepId?: string;
}

class UpdateMemberShareDto {
	@IsString()
	@IsNotEmpty()
	promiseId: string;

	@IsNumber()
	@Min(0)
	percentage: number;

	@IsString()
	@IsOptional()
	targetStepId?: string;
}

@NextAuthGuard("user")
class ApiMemberShareHandler {
	@Post()
	public async createMemberShare(
		@Req() req: NextApiRequestWithUser,
		@Body(ValidationPipe) data: CreateMemberShareDto,
	) {
		const { projectId, memberId, percentage, targetStepId } = data;

		if (!targetStepId) {
			throw new Error("Target step ID is required");
		}

		// Check if the project exists
		const project = await prisma.project.findUnique({
			where: { id: projectId },
			include: {
				team: {
					include: {
						members: true,
					},
				},
			},
		});

		if (!project) {
			throw new Error("Project not found");
		}

		// Check if the current user is the project author
		if (project.authorId !== req.user.id) {
			throw new Error("You do not have permission to update the member shares");
		}

		// Get the information about the current project workflow
		const workflow = await prisma.projectWorkflow.findFirst({
			where: { projectId },
			include: {
				currentStep: true,
			},
		});

		// Check if the specified step has been reached for vesting
		let vested = true;
		if (targetStepId && workflow?.currentStep) {
			// Get the information about the step that will be used for vesting
			const targetStep = await prisma.projectWorkflowStep.findUnique({
				where: { id: targetStepId },
			});

			// Check if the project is on the specified step or has passed it
			if (targetStep && workflow.currentStep.order < targetStep.order) {
				vested = false; // The share is not vested yet, since the target step has not been reached
			}
		}

		const equity = await ProjectEquityRepository.getProjectEquity(projectId);

		// Get the current data about the shares
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
				createdById: req.user.id,
			});
		}

		// Check if the total sum does not exceed 100%
		const totalTeamShares = equity.equityAllocations.reduce(
			(sum: number, share: any) => sum + share.percentage,
			0,
		);
		const totalAllocation =
			equity.platformShare +
			equity.mentorFundShare +
			equity.investmentReserve +
			totalTeamShares;

		if (totalAllocation > 100) {
			throw new Error("Total share exceeds 100%");
		}

		return { ...memberShare, percentage };
	}

	@Put()
	public async updateMemberShare(
		@Req() req: NextApiRequestWithUser,
		@Body(ValidationPipe) data: UpdateMemberShareDto,
	) {
		const { promiseId, percentage, targetStepId } = data;

		return await prisma.equityPromise.update({
			where: { id: promiseId },
			data: { percentage, targetStepId },
		});
	}

	@Delete()
	public async deleteMemberShare(@Query("promiseId") promiseId: string) {
		return await prisma.equityPromise.delete({ where: { id: promiseId } });
	}
}

export default createHandler(ApiMemberShareHandler);
