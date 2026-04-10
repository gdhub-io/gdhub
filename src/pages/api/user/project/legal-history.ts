import { IsString } from "class-validator";
import {
	createHandler,
	Get,
	Query,
	Req,
	ValidationPipe,
} from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { prisma } from "@/services/prisma";

class ProjectLegalHistoryQueryDto {
	@IsString()
	projectId: string;
}

@NextAuthGuard("user")
class ApiProjectLegalHistoryHandler {
	@Get()
	public async get(
		@Req() req: NextApiRequestWithUser,
		@Query(ValidationPipe) { projectId }: ProjectLegalHistoryQueryDto,
	) {
		const project = await prisma.project.findFirst({
			where: {
				id: projectId,
				OR: [
					{ authorId: req.user.id },
					{ team: { members: { some: { userId: req.user.id } } } },
				],
			},
			select: {
				id: true,
				name: true,
				slug: true,
				createdAt: true,
				updatedAt: true,
				usesCoDevelopmentAgreement: true,
				damageCompensationEnabled: true,
				damageCompensationAmount: true,
				damageCompensationCurrency: true,
				activeLegalSnapshotId: true,
				equity: {
					select: {
						id: true,
						platformShare: true,
						mentorFundShare: true,
						investmentReserve: true,
						createdAt: true,
						updatedAt: true,
					},
				},
			},
		});

		if (!project) {
			throw new Error("Project not found");
		}

		const [snapshots, events] = await Promise.all([
			prisma.projectLegalSnapshot.findMany({
				where: { projectId },
				orderBy: { createdAt: "asc" },
				select: {
					id: true,
					title: true,
					templateVersion: true,
					status: true,
					params: true,
					createdAt: true,
					supersededAt: true,
					createdBy: {
						select: {
							id: true,
							name: true,
							image: true,
						},
					},
				},
			}),
			prisma.projectLegalEvent.findMany({
				where: { projectId },
				orderBy: { createdAt: "desc" },
				select: {
					id: true,
					type: true,
					payload: true,
					effectiveAt: true,
					createdAt: true,
					snapshotId: true,
					actorUser: {
						select: {
							id: true,
							name: true,
							image: true,
						},
					},
					subjectUser: {
						select: {
							id: true,
							name: true,
							image: true,
						},
					},
					subjectTeamMember: {
						select: {
							id: true,
							status: true,
							user: {
								select: {
									id: true,
									name: true,
									image: true,
								},
							},
						},
					},
				},
			}),
		]);

		return {
			project: {
				id: project.id,
				name: project.name,
				slug: project.slug,
				createdAt: project.createdAt,
				updatedAt: project.updatedAt,
				usesCoDevelopmentAgreement: project.usesCoDevelopmentAgreement,
				damageCompensationEnabled: project.damageCompensationEnabled,
				damageCompensationAmount: project.damageCompensationAmount,
				damageCompensationCurrency: project.damageCompensationCurrency,
			},
			equity: project.equity,
			activeLegalSnapshotId: project.activeLegalSnapshotId,
			snapshots,
			events,
		};
	}
}

export default createHandler(ApiProjectLegalHistoryHandler);
