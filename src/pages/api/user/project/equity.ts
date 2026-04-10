import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { IsNotEmpty, IsNumber, IsString, Min } from "class-validator";
import type { NextApiRequest } from "next";
import {
	Body,
	createHandler,
	Get,
	Put,
	Query,
	Req,
	ValidationPipe,
} from "next-api-decorators";
import {
	DEFAULT_DAMAGE_COMPENSATION_AMOUNT,
	DEFAULT_DAMAGE_COMPENSATION_CURRENCY,
	PLATFORM_SHARE_PERCENT,
} from "@/config/legal";
import { persistProjectLegalSnapshot } from "@/helpers/legal/projectLegalPersistence";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { prisma } from "@/services/prisma";

class ProjectEquityDto {
	@IsString()
	@IsNotEmpty()
	id: string;

	@IsNumber()
	@Min(2)
	mentorFundShare: number;

	@IsNumber()
	@Min(0)
	investmentReserve: number;
}

class ProjectEquityQueryDto {
	@IsString()
	@IsNotEmpty()
	projectId: string;
}

@NextAuthGuard("user")
class ApiProjectEquityHandler {
	@Get()
	public async get(
		@Query(ValidationPipe) { projectId }: ProjectEquityQueryDto,
	) {
		const projectEquity = await prisma.projectEquity.findUnique({
			where: { projectId },
			include: {
				equityAllocations: {
					include: {
						promises: {
							where: { isExecuted: false },
							take: 1,
							orderBy: { createdAt: "desc" },
						},
					},
				},
			},
		});

		if (!projectEquity) {
			throw new Error("Project not found");
		}

		// If equity is not set, return default values
		if (!projectEquity) {
			return {
				platformShare: 3,
				mentorFundShare: 7,
				investmentReserve: 40,
			};
		}

		return projectEquity;
	}

	@Put()
	public async save(
		@Body(ValidationPipe) equityData: ProjectEquityDto,
		@Req() req: NextApiRequest,
	) {
		const { id, mentorFundShare, investmentReserve } = equityData;

		// Check if project equity exists
		const projectEquity = await prisma.projectEquity.findUnique({
			where: { id },
			include: {
				project: {
					include: {
						author: {
							select: {
								name: true,
							},
						},
					},
				},
			},
		});

		if (!projectEquity) {
			throw new Error("Project equity not found");
		}

		// Get user from decorated request
		// NextAuthGuard already checked authentication
		const userId = (req as any).user?.id;

		if (!userId) {
			throw new Error("Unauthorized");
		}

		// Check if current user is project author
		if (projectEquity.project.authorId !== userId) {
			throw new Error("You are not authorized to modify this project equity");
		}

		// Check if allocation is correct
		const totalAllocation = mentorFundShare + investmentReserve;

		if (totalAllocation > 100) {
			throw new Error("Total allocation exceeds 100%");
		}

		const updatedEquity = await prisma.projectEquity.update({
			where: { id },
			data: { mentorFundShare, investmentReserve },
		});

		if (projectEquity.mentorFundShare !== mentorFundShare) {
			await persistProjectLegalSnapshot({
				projectId: projectEquity.project.id,
				projectName: projectEquity.project.name,
				projectSlug: projectEquity.project.slug,
				authorName: projectEquity.project.author?.name,
				agreementDate: projectEquity.project.createdAt,
				mentorFundShare,
				platformShare: updatedEquity.platformShare ?? PLATFORM_SHARE_PERCENT,
				damageCompensationEnabled:
					projectEquity.project.damageCompensationEnabled ?? false,
				damageCompensationAmount:
					projectEquity.project.damageCompensationAmount ??
					DEFAULT_DAMAGE_COMPENSATION_AMOUNT,
				damageCompensationCurrency:
					projectEquity.project.damageCompensationCurrency ??
					DEFAULT_DAMAGE_COMPENSATION_CURRENCY,
				createdById: userId,
				eventType: prismaClient.ProjectLegalEventType.AgreementUpdated,
				payload: {
					changedFields: [
						{
							field: "mentorFundShare",
							from: projectEquity.mentorFundShare,
							to: mentorFundShare,
						},
					],
				},
			});
		}

		return updatedEquity;
	}
}

export default createHandler(ApiProjectEquityHandler);
