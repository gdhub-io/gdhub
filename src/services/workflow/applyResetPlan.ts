import type { ResetPlan } from "./planReset";

/**
 * The writes a reset plan turns into.
 *
 * Kept apart from the route so it can be exercised against a fake store: the
 * plan was always right, and the bug lived here — tasks were created and then
 * swept away by the same clean-up pass, so a reset moved steps and quietly lost
 * every task. A pure planner proves what *should* happen; only this proves what
 * does.
 */

/** The slice of a Prisma transaction this needs. */
export type ResetWriter = {
	projectWorkflowStep: {
		update(args: {
			where: { id: string };
			data: Record<string, unknown>;
		}): Promise<unknown>;
		create(args: { data: Record<string, unknown> }): Promise<{ id: string }>;
	};
	projectWorkflowTask: {
		update(args: {
			where: { id: string };
			data: Record<string, unknown>;
		}): Promise<unknown>;
		create(args: { data: Record<string, unknown> }): Promise<unknown>;
		deleteMany(args: { where: Record<string, unknown> }): Promise<unknown>;
	};
};

/** `null` for a JSON column that should be cleared. */
export type JsonNull = unknown;

/** Writes the plan and returns the step ids that survive it, in order. */
export async function applyResetPlan(
	tx: ResetWriter,
	workflowId: string,
	plan: ResetPlan,
	dbNull: JsonNull,
): Promise<string[]> {
	const survivingStepIds: string[] = [];

	for (const [index, step] of plan.steps.entries()) {
		let stepId = step.id;

		// A step is finished when its tasks are, so clearing progress has to clear
		// the flag too — otherwise a step stays marked done with nothing done in it.
		const done = step.tasks.length > 0 && step.tasks.every((task) => task.done);
		const stepData = {
			name: step.name,
			description: step.description ?? "",
			order: index,
			done,
			...(done ? null : { finishedAt: null }),
		};

		if (stepId) {
			await tx.projectWorkflowStep.update({
				where: { id: stepId },
				data: stepData,
			});
		} else {
			const created = await tx.projectWorkflowStep.create({
				data: { ...stepData, projectWorkflowId: workflowId },
			});
			stepId = created.id;
		}

		survivingStepIds.push(stepId);

		// Clearing comes first, on the ids the plan carries over. Doing it after the
		// writes would need the new rows' ids in the exemption list, and forgetting
		// them there is invisible — the tasks are written and then deleted inside
		// one transaction.
		const keptTaskIds = step.tasks
			.map((task) => task.id)
			.filter((id): id is string => Boolean(id));

		await tx.projectWorkflowTask.deleteMany({
			// An explicit branch rather than `notIn: []`: "not in nothing" meaning
			// "everything" is a rule to remember, and this is the delete that would
			// take a project's whole history with it.
			where: keptTaskIds.length
				? { stepId, id: { notIn: keptTaskIds } }
				: { stepId },
		});

		for (const [taskIndex, task] of step.tasks.entries()) {
			const data = {
				name: task.name,
				description: task.description ?? null,
				required: task.required,
				done: task.done,
				order: taskIndex,
				condition: task.condition ?? dbNull,
				...(task.done ? null : { finishedAt: null }),
			};

			if (task.id) {
				await tx.projectWorkflowTask.update({ where: { id: task.id }, data });
			} else {
				await tx.projectWorkflowTask.create({ data: { ...data, stepId } });
			}
		}
	}

	return survivingStepIds;
}
