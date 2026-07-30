import type { ProjectWorkflowTask } from "@gdhub-io/gdhub-prisma";
import { WorkflowTaskConditionSchema } from "@/schemas/workflowTaskCondition";
import { prisma } from "@/services/prisma";
import { evaluateTaskCondition } from "./evaluateTaskCondition";

type WorkflowTask = ProjectWorkflowTask;

/**
 * Recompute `done` for the given step tasks from their conditions and persist
 * changes. Task completion is evaluated by the platform, not toggled by users.
 *
 * A task without a (valid) condition is not auto-evaluated — its stored `done`
 * is kept as-is. Returns the tasks with up-to-date `done`.
 */
export async function recomputeStepTasks(
	tasks: WorkflowTask[],
	projectId: string,
	stepId: string,
): Promise<WorkflowTask[]> {
	return Promise.all(
		tasks.map(async (task) => {
			const parsed = WorkflowTaskConditionSchema.safeParse(task.condition);
			if (!parsed.success) return task;

			const done = await evaluateTaskCondition(parsed.data, {
				projectId,
				stepId,
			});
			if (done === task.done) return task;

			return prisma.projectWorkflowTask.update({
				where: { id: task.id },
				data: { done, finishedAt: done ? new Date() : null },
			});
		}),
	);
}
