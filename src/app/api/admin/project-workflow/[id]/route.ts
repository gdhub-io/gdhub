import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const UpdateProjectWorkflowSchema = z.object({
	title: z.string().optional(),
	steps: z.array(z.any()).optional(),
	currentStepId: z.string().optional(),
});

type UpdateProjectWorkflowBody = z.infer<typeof UpdateProjectWorkflowSchema>;

async function updateStepTasks(
	stepId: string,
	newTasks: any[],
	existingTasks: prismaClient.ProjectWorkflowTask[],
) {
	const existingTasksMap = new Map(
		existingTasks.map((task) => [task.id, task]),
	);

	const processedTaskIds = new Set<string>();

	for (let index = 0; index < newTasks.length; index++) {
		const taskData = newTasks[index];
		const existingTask = taskData.id ? existingTasksMap.get(taskData.id) : null;

		if (existingTask) {
			await prisma.projectWorkflowTask.update({
				where: { id: existingTask.id },
				data: {
					description:
						taskData.description || taskData.name || taskData.title || "",
					required: Boolean(taskData.required),
					order: index,
					done: Boolean(taskData.done),
				},
			});

			processedTaskIds.add(existingTask.id);
		} else {
			const newTask = await prisma.projectWorkflowTask.create({
				data: {
					description:
						taskData.description || taskData.name || taskData.title || "",
					required: Boolean(taskData.required),
					order: index,
					stepId,
					done: Boolean(taskData.done || false),
				},
			});

			processedTaskIds.add(newTask.id);
		}
	}

	const tasksToDelete = existingTasks.filter(
		(task) => !processedTaskIds.has(task.id),
	);
	for (const task of tasksToDelete) {
		await prisma.projectWorkflowTask.delete({
			where: { id: task.id },
		});
	}
}

async function updateWorkflowSteps(
	workflowId: string,
	newSteps: any[],
	existingSteps: (prismaClient.ProjectWorkflowStep & {
		tasks: prismaClient.ProjectWorkflowTask[];
	})[],
) {
	const existingStepsMap = new Map(
		existingSteps.map((step) => [step.id, step]),
	);

	const processedStepIds = new Set<string>();

	for (let index = 0; index < newSteps.length; index++) {
		const stepData = newSteps[index];
		const existingStep = stepData.id ? existingStepsMap.get(stepData.id) : null;

		if (existingStep) {
			await prisma.projectWorkflowStep.update({
				where: { id: existingStep.id },
				data: {
					name: stepData.name || stepData.title,
					description: stepData.description || "",
					order: index,
				},
			});

			if (stepData.tasks) {
				await updateStepTasks(
					existingStep.id,
					stepData.tasks,
					existingStep.tasks,
				);
			}

			processedStepIds.add(existingStep.id);
		} else {
			const newStep = await prisma.projectWorkflowStep.create({
				data: {
					name: stepData.name || stepData.title,
					description: stepData.description || "",
					order: index,
					projectWorkflowId: workflowId,
				},
			});

			if (stepData.tasks && stepData.tasks.length > 0) {
				await updateStepTasks(newStep.id, stepData.tasks, []);
			}

			processedStepIds.add(newStep.id);
		}
	}

	const stepsToDelete = existingSteps.filter(
		(step) => !processedStepIds.has(step.id),
	);
	for (const step of stepsToDelete) {
		await prisma.projectWorkflowStep.delete({
			where: { id: step.id },
		});
	}
}

export const GET = withAuth({
	mode: "user",
	roles: [prismaClient.UserRole.Admin],
})(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { id } = (await ctx.params) as { id: string };

	const projectWorkflow = await prisma.projectWorkflow.findUnique({
		where: { id },
		include: {
			project: {
				select: {
					id: true,
					name: true,
					slug: true,
					author: {
						select: {
							name: true,
						},
					},
				},
			},
			currentStep: {
				select: {
					id: true,
					name: true,
					order: true,
				},
			},
			steps: {
				include: {
					tasks: {
						orderBy: {
							order: "asc",
						},
					},
				},
				orderBy: {
					order: "asc",
				},
			},
		},
	});

	if (!projectWorkflow) {
		return json(null);
	}

	const totalTasks = projectWorkflow.steps.reduce(
		(total: number, step: any) => total + step.tasks.length,
		0,
	);
	const completedTasks = projectWorkflow.steps.reduce(
		(total: number, step: any) =>
			total + step.tasks.filter((task: any) => task.done).length,
		0,
	);
	const completionPercentage =
		totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

	const createdAt = new Date(projectWorkflow.createdAt);
	const now = new Date();
	const daysInProgress = Math.floor(
		(now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24),
	);

	const workflowWithAnalytics = {
		...projectWorkflow,
		analytics: {
			totalTasks,
			completedTasks,
			completionPercentage,
			daysInProgress,
			currentStepName: projectWorkflow.currentStep?.name || "Не начат",
			currentStepOrder: projectWorkflow.currentStep?.order || 0,
			totalSteps: projectWorkflow.steps.length,
		},
	};

	return json(workflowWithAnalytics);
});

export const PUT = withAuth({
	mode: "user",
	roles: [prismaClient.UserRole.Admin],
})(
	withValidation(UpdateProjectWorkflowSchema)(
		async (_req, ctx, { user, body }) => {
			const currentUser = user as SessionUser | undefined;
			if (!currentUser) return apiError.unauthorized();
			const { id } = (await ctx.params) as { id: string };
			const { title, steps, currentStepId } = body as UpdateProjectWorkflowBody;

			const data: Prisma.ProjectWorkflowUpdateInput = {};

			if (title !== undefined) {
				data.title = title;
			}

			if (currentStepId !== undefined) {
				data.currentStep = { connect: { id: currentStepId } };
			}

			if (steps) {
				const existingWorkflow = await prisma.projectWorkflow.findUnique({
					where: { id },
					include: {
						steps: {
							include: {
								tasks: true,
							},
							orderBy: {
								order: "asc",
							},
						},
					},
				});

				if (existingWorkflow) {
					await updateWorkflowSteps(id, steps as any[], existingWorkflow.steps);
				}
			}

			const projectWorkflow = await prisma.projectWorkflow.update({
				where: { id },
				data,
			});

			return json(projectWorkflow);
		},
	),
);
