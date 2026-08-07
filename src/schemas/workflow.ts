import { z } from "zod";
import { WorkflowTaskConditionSchema } from "./workflowTaskCondition";

/**
 * Two shapes wear the name "workflow step", and conflating them is what makes
 * this area dangerous.
 *
 * A **template** step is a plain object inside `WorkflowSchema.steps`, a single
 * JSON column. It has no id: its identity is its position in the array, and the
 * package already declares the stored shape as `PrismaJson.WorkflowStep`. The
 * schema below is that type's runtime gate — `assertTemplateShape` keeps the two
 * from drifting.
 *
 * A **project** step is a row in `ProjectWorkflowStep`, with an id, an order and
 * a done flag. There the id is the whole game: it decides update versus create,
 * and its absence decides deletion.
 */

const conditionField = WorkflowTaskConditionSchema.nullish();

/** A task as it is stored inside a template's JSON. */
export const WorkflowTaskTemplateSchema = z.object({
	name: z.string().min(1),
	description: z.string().optional(),
	required: z.boolean(),
	condition: WorkflowTaskConditionSchema.optional(),
});

/** A step as it is stored inside a template's JSON. */
export const WorkflowStepTemplateSchema = z.object({
	name: z.string().min(1),
	title: z.string().optional(),
	description: z.string().optional(),
	tasks: z.array(WorkflowTaskTemplateSchema),
});

/**
 * A template with no steps is not a template, and every wipe we have seen came
 * in as an empty array from a form that had not loaded yet. Requiring at least
 * one step turns that class of accident into a 400 instead of an empty column.
 */
export const WorkflowStepsTemplateSchema = z
	.array(WorkflowStepTemplateSchema)
	.min(1);

/** Compile-time proof that what we validate is what the column stores. */
type TemplateStep = z.infer<typeof WorkflowStepTemplateSchema>;
export const assertTemplateShape = (steps: TemplateStep[]) =>
	steps satisfies PrismaJson.WorkflowStep[];

/** A task as the project editor sends it back. */
export const WorkflowTaskInputSchema = z.object({
	id: z.string().min(1).optional(),
	name: z.string().nullish(),
	title: z.string().nullish(),
	description: z.string().nullish(),
	required: z.boolean().optional(),
	done: z.boolean().optional(),
	condition: conditionField,
});

/** A step as the project editor sends it back. */
export const WorkflowStepInputSchema = z.object({
	id: z.string().min(1).optional(),
	name: z.string().nullish(),
	title: z.string().nullish(),
	description: z.string().nullish(),
	tasks: z.array(WorkflowTaskInputSchema).optional(),
});

/** Same reason as the template list: an empty list is a bug, not an intent. */
export const WorkflowStepsInputSchema = z.array(WorkflowStepInputSchema).min(1);

export type WorkflowTaskInput = z.infer<typeof WorkflowTaskInputSchema>;
export type WorkflowStepInput = z.infer<typeof WorkflowStepInputSchema>;

/** A step's display name, from whichever field the editor filled in. */
export function stepName(step: WorkflowStepInput): string | null {
	return step.name?.trim() || step.title?.trim() || null;
}

/** A task's display name, from whichever field the editor filled in. */
export function taskName(task: WorkflowTaskInput): string | null {
	return task.name?.trim() || task.title?.trim() || null;
}
