import { hasBlocks } from "@/helpers/editorjs";
/**
 * A workflow template's steps as its editor holds them, and back (GDHUB-97).
 * The template's steps are one JSON column replaced whole on save, so a field
 * the round trip drops is a field every save wipes — which is why it is tested.
 */

export type TaskDraft = {
	key: string;
	name: string;
	description?: string;
	required: boolean;
	condition?: PrismaJson.WorkflowTaskCondition | null;
};

export type StepDraft = {
	key: string;
	name: string;
	/** Not edited here, but carried: the column is replaced whole on save. */
	title?: string;
	description?: string;
	goal?: string;
	content?: PrismaJson.EditorJsContent;
	tasks: TaskDraft[];
};

/**
 * Template steps live in one JSON column and carry no ids — their identity is
 * their position. A rail you can reorder needs something stabler than an index,
 * so each row gets a key that lives only in the editor and never reaches the
 * column.
 */
let keySeed = 0;
export const nextKey = () => `k${++keySeed}`;

export function toDrafts(steps: PrismaJson.WorkflowStep[]): StepDraft[] {
	return steps.map((step) => ({
		key: nextKey(),
		name: step.name,
		title: step.title,
		description: step.description,
		goal: step.goal,
		content: step.content,
		tasks: (step.tasks ?? []).map((task) => ({
			key: nextKey(),
			name: task.name,
			description: task.description,
			required: Boolean(task.required),
			condition: task.condition ?? null,
		})),
	}));
}

export function toPayload(steps: StepDraft[]): PrismaJson.WorkflowStep[] {
	return steps.map((step) => ({
		name: step.name,
		title: step.title,
		description: step.description,
		goal: step.goal?.trim() || undefined,
		content: hasBlocks(step.content) ? step.content : undefined,
		tasks: step.tasks.map((task) => ({
			name: task.name,
			description: task.description,
			required: task.required,
			...(task.condition ? { condition: task.condition } : null),
		})),
	}));
}
