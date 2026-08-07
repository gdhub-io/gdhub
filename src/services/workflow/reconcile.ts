import type { WorkflowStepInput, WorkflowTaskInput } from "@/schemas/workflow";

/** The bits of a stored step the reconciler needs to decide what changed. */
export type ExistingStep = {
	id: string;
	tasks: { id: string }[];
};

export type StepPlan = {
	/** Steps that exist and keep existing, in their new order. */
	update: { id: string; order: number; input: WorkflowStepInput }[];
	/** Steps the payload introduces, in their new order. */
	create: { order: number; input: WorkflowStepInput }[];
	/** Steps the payload no longer mentions. */
	deleteIds: string[];
};

export type TaskPlan = {
	update: { id: string; order: number; input: WorkflowTaskInput }[];
	create: { order: number; input: WorkflowTaskInput }[];
	deleteIds: string[];
};

/**
 * Work out what a submitted list of steps means for the stored ones, without
 * touching the database.
 *
 * Splitting this from the writing is what makes the dangerous part testable:
 * "does this payload delete anything it should not?" is a question about a plan,
 * not about a transaction. A payload can only delete a step by leaving out an id
 * it was given — an id it never saw cannot be dropped, and an empty payload
 * never reaches here because the schema rejects it.
 */
export function planSteps(
	incoming: WorkflowStepInput[],
	existing: ExistingStep[],
): StepPlan {
	const existingIds = new Set(existing.map((step) => step.id));
	const seen = new Set<string>();

	const update: StepPlan["update"] = [];
	const create: StepPlan["create"] = [];

	incoming.forEach((input, order) => {
		// An id the workflow does not own is not an update — treating it as one
		// would let a stale editor rewrite another workflow's step.
		if (input.id && existingIds.has(input.id)) {
			seen.add(input.id);
			update.push({ id: input.id, order, input });
			return;
		}
		create.push({ order, input });
	});

	return {
		update,
		create,
		deleteIds: existing.filter((s) => !seen.has(s.id)).map((s) => s.id),
	};
}

/** The same reconciliation, one level down. */
export function planTasks(
	incoming: WorkflowTaskInput[],
	existing: { id: string }[],
): TaskPlan {
	const existingIds = new Set(existing.map((task) => task.id));
	const seen = new Set<string>();

	const update: TaskPlan["update"] = [];
	const create: TaskPlan["create"] = [];

	incoming.forEach((input, order) => {
		if (input.id && existingIds.has(input.id)) {
			seen.add(input.id);
			update.push({ id: input.id, order, input });
			return;
		}
		create.push({ order, input });
	});

	return {
		update,
		create,
		deleteIds: existing.filter((t) => !seen.has(t.id)).map((t) => t.id),
	};
}

/**
 * Which step should be current after the plan is applied.
 *
 * The current step is a foreign key on the workflow, so pointing it at a step
 * that is about to be deleted leaves the project without a stage — the same
 * end state as the wipe this module exists to prevent.
 */
export function resolveCurrentStepId(
	requested: string | null | undefined,
	survivingIds: string[],
	previous: string | null,
): string | null {
	if (requested && survivingIds.includes(requested)) return requested;
	if (previous && survivingIds.includes(previous)) return previous;
	return null;
}
