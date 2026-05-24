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

const WorkflowQuerySchema = z.object({
	projectId: z.string(),
});

type WorkflowQuery = z.infer<typeof WorkflowQuerySchema>;

export const GET = withAuth({ mode: "user" })(
	withValidation(
		WorkflowQuerySchema,
		"query",
	)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const { projectId } = body as WorkflowQuery;

		const projectAuthor = await prisma.teamMember.count({
			where: {
				userId: currentUser.id,
				team: {
					project: {
						id: projectId,
					},
				},
				status: prismaClient.TeamMemberStatus.Founder,
			},
		});

		const projectWorkflow = await prisma.projectWorkflow.findFirst({
			where: { projectId },
			include: {
				currentStep: {
					include: {
						tasks: true,
						equityPromises: projectAuthor
							? {
									where: { isExecuted: false },
									select: {
										id: true,
										percentage: true,
										allocation: {
											select: {
												id: true,
												percentage: true,
												owner: { select: { id: true, name: true } },
											},
										},
									},
								}
							: undefined,
					},
				},
				steps: {
					select: {
						id: true,
						order: true,
						name: true,
						plannedAt: true,
						finishedAt: true,
					},
					orderBy: { order: "asc" },
				},
			},
		});

		return json(projectWorkflow);
	}),
);
