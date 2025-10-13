import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import type { JsonValue } from "@prisma/client/runtime/library";
import { IsArray, IsOptional, IsString } from "class-validator";
import {
	Body,
	createHandler,
	Get,
	Param,
	Put,
	Req,
	ValidationPipe,
} from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { prisma } from "@/services/prisma";

class UpdateProjectWorkflowDto {
	@IsString()
	@IsOptional()
	title?: string;

	@IsArray()
	@IsOptional()
	steps?: JsonValue[];

	@IsString()
	@IsOptional()
	currentStepId?: string;
}

@NextAuthGuard("user", [prismaClient.UserRole.Admin])
class ApiProjectWorkflowAdminHandler {
	constructor() {}

	@Get("/:id")
	public async get(
		@Req() req: NextApiRequestWithUser,
		@Param("id") id: string,
	) {
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
			return null;
		}

		// Calculate analytics
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

		// Calculate days in progress
		const createdAt = new Date(projectWorkflow.createdAt);
		const now = new Date();
		const daysInProgress = Math.floor(
			(now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24),
		);

		// Add analytics to response
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

		return workflowWithAnalytics;
	}

	@Put("/:id")
	public async update(
		@Req() req: NextApiRequestWithUser,
		@Param("id") id: string,
		@Body(ValidationPipe) {
			title,
			steps,
			currentStepId,
		}: UpdateProjectWorkflowDto,
	) {
		const data: any = {};

		if (title !== undefined) {
			data.title = title;
		}

		if (currentStepId !== undefined) {
			data.currentStepId = currentStepId;
		}

		// Handle steps update if provided
		if (steps) {
			// First, get existing steps to compare
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
				// Update steps logic
				await this.updateWorkflowSteps(
					id,
					steps as any[],
					existingWorkflow.steps,
				);
			}
		}

		const projectWorkflow = await prisma.projectWorkflow.update({
			where: { id },
			data,
		});

		return projectWorkflow;
	}

	private async updateWorkflowSteps(
		workflowId: string,
		newSteps: any[],
		existingSteps: (prismaClient.ProjectWorkflowStep & {
			tasks: prismaClient.ProjectWorkflowTask[];
		})[],
	) {
		// Create map of existing steps by ID for easy lookup
		const existingStepsMap = new Map(
			existingSteps.map((step) => [step.id, step]),
		);

		// Track which steps we've processed
		const processedStepIds = new Set<string>();

		// Process new/updated steps
		for (let index = 0; index < newSteps.length; index++) {
			const stepData = newSteps[index];
			const existingStep = stepData.id
				? existingStepsMap.get(stepData.id)
				: null;

			if (existingStep) {
				// Update existing step
				await prisma.projectWorkflowStep.update({
					where: { id: existingStep.id },
					data: {
						name: stepData.name || stepData.title,
						description: stepData.description || "",
						order: index,
					},
				});

				// Update tasks for this step
				if (stepData.tasks) {
					await this.updateStepTasks(
						existingStep.id,
						stepData.tasks,
						existingStep.tasks,
					);
				}

				processedStepIds.add(existingStep.id);
			} else {
				// Create new step
				const newStep = await prisma.projectWorkflowStep.create({
					data: {
						name: stepData.name || stepData.title,
						description: stepData.description || "",
						order: index,
						projectWorkflowId: workflowId,
					},
				});

				// Create tasks for new step
				if (stepData.tasks && stepData.tasks.length > 0) {
					await this.updateStepTasks(newStep.id, stepData.tasks, []);
				}

				processedStepIds.add(newStep.id);
			}
		}

		// Delete steps that weren't in the new data
		const stepsToDelete = existingSteps.filter(
			(step) => !processedStepIds.has(step.id),
		);
		for (const step of stepsToDelete) {
			await prisma.projectWorkflowStep.delete({
				where: { id: step.id },
			});
		}
	}

	private async updateStepTasks(
		stepId: string,
		newTasks: any[],
		existingTasks: prismaClient.ProjectWorkflowTask[],
	) {
		// Create map of existing tasks by ID for easy lookup
		const existingTasksMap = new Map(
			existingTasks.map((task) => [task.id, task]),
		);

		// Track which tasks we've processed
		const processedTaskIds = new Set<string>();

		// Process new/updated tasks
		for (let index = 0; index < newTasks.length; index++) {
			const taskData = newTasks[index];
			const existingTask = taskData.id
				? existingTasksMap.get(taskData.id)
				: null;

			if (existingTask) {
				// Update existing task
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
				// Create new task
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

		// Delete tasks that weren't in the new data
		const tasksToDelete = existingTasks.filter(
			(task) => !processedTaskIds.has(task.id),
		);
		for (const task of tasksToDelete) {
			await prisma.projectWorkflowTask.delete({
				where: { id: task.id },
			});
		}
	}
}

export default createHandler(ApiProjectWorkflowAdminHandler);
