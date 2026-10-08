import type {
	ProjectWorkflow,
	ProjectWorkflowStep,
	ProjectWorkflowTask,
	WorkflowSchema,
} from "@gdhub-io/gdhub-prisma";
import type { WorkflowTaskCondition } from "@/schemas/workflowTaskCondition";

// Types based on Prisma schema
export type {
	ProjectWorkflow,
	ProjectWorkflowStep,
	ProjectWorkflowTask,
	WorkflowSchema,
};

// JSON structure for WorkflowSchema.steps
export interface WorkflowStepTemplate {
	id: string;
	name: string;
	title: string;
	description: string;
	order?: number;
	tasks: WorkflowTaskTemplate[];
}

export interface WorkflowTaskTemplate {
	id: string;
	name: string;
	title: string;
	description: string;
	required: boolean;
	order?: number;
	done?: boolean;
	condition?: WorkflowTaskCondition | null;
}

// Extended types for the editor
export interface WorkflowSchemaWithSteps extends Omit<WorkflowSchema, "steps"> {
	steps: WorkflowStepTemplate[];
}

// Helper functions for validation
export const validateWorkflowName = (name: string): boolean => {
	return /^[a-z0-9-]+$/.test(name);
};

// Utility functions for converting between formats
export const normalizeWorkflowSteps = (
	steps: any[],
): WorkflowStepTemplate[] => {
	return steps.map((step: any, index: number) => ({
		id: step.id || `step-${index}`,
		name: step.name || "",
		title: step.title || "",
		description: step.description || "",
		order: step.order || index,
		tasks: (step.tasks || []).map((task: any, taskIndex: number) => ({
			id: task.id || `task-${index}-${taskIndex}`,
			name: task.name || "",
			title: task.title || "",
			description: task.description || "",
			required: Boolean(task.required),
			order: task.order || taskIndex,
			done: Boolean(task.done),
			condition: task.condition ?? null,
		})),
	}));
};

type EquityPromise = {
	id: string;
	percentage: number;
	allocation: {
		owner: {
			name: string;
		};
		percentage: number;
	};
};

/** What `/api/user/project/workflow` returns: the steps and the current one in full. */
export type ProjectWorkflowWithSteps = ProjectWorkflow & {
	steps: ProjectWorkflowStep[];
	currentStep: ProjectWorkflowStep & {
		tasks: ProjectWorkflowTask[];
		equityPromises?: EquityPromise[];
	};
};
