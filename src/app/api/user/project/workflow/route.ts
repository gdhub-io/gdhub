import { TeamMemberStatus } from "@gdhub-io/gdhub-prisma";
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
				status: TeamMemberStatus.Founder,
			},
		});

		const projectWorkflow = await prisma.projectWorkflow.findFirst({
			where: { projectId },
			include: {
				currentStep: {
					include: {
						tasks: { orderBy: { order: "asc" } },
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
						// Where the stage's text lives (notion::table.slug): the path opens any stage.
						description: true,
						plannedAt: true,
						finishedAt: true,
					},
					orderBy: { order: "asc" },
				},
			},
		});

		// Task completion is evaluated by the platform from project data, not
		// toggled by users. Recompute the current step's tasks before returning.
		if (projectWorkflow?.currentStep) {
			projectWorkflow.currentStep.tasks = await recomputeStepTasks(
				projectWorkflow.currentStep.tasks,
				projectId,
				projectWorkflow.currentStep.id,
			);
		}

		return json(projectWorkflow);
	}),
);
