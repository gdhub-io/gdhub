import { TeamMemberStatus } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { stageOf } from "@/lib/workflow/matchKey";
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
				// Each stage's text falls back to its template step's (GDHUB-97).
				schema: { select: { steps: true } },
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
						content: true,
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

		if (!projectWorkflow) return json(null);
		const { schema, ...workflow } = projectWorkflow;
		// The goals stay on the server; only the text reaches the author.
		return json({
			...workflow,
			steps: workflow.steps.map(({ content, ...step }) => ({
				...step,
				content: stageOf(schema.steps, { ...step, content }).content,
			})),
		});
	}),
);
