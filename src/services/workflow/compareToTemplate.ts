/** A project's step, reduced to what a comparison cares about. */
export type ProjectStepShape = {
	name: string;
	tasks: { name: string | null }[];
};

/** A template step, same reduction. */
export type TemplateStepShape = {
	name: string;
	tasks?: { name: string }[];
};

const normalise = (value: string | null | undefined) =>
	(value ?? "").trim().toLowerCase();

/**
 * Has this project's workflow drifted from the template it came from?
 *
 * A project owns its steps from the moment it is created — editing the template
 * never reaches it. So "Modified" is not a stored flag but an observation, and
 * the admin list uses it to answer the only question that matters before a
 * reset: is there anything here that a reset would throw away?
 *
 * Names and order are the comparison. Descriptions and flags are edited far too
 * often to count as drift, and a step renamed back to its original name is, for
 * this purpose, not modified.
 */
export function isModifiedFromTemplate(
	projectSteps: ProjectStepShape[],
	templateSteps: TemplateStepShape[],
): boolean {
	if (projectSteps.length !== templateSteps.length) return true;

	return projectSteps.some((step, index) => {
		const template = templateSteps[index];
		if (normalise(step.name) !== normalise(template.name)) return true;

		const templateTasks = template.tasks ?? [];
		if (step.tasks.length !== templateTasks.length) return true;

		return step.tasks.some(
			(task, taskIndex) =>
				normalise(task.name) !== normalise(templateTasks[taskIndex]?.name),
		);
	});
}
