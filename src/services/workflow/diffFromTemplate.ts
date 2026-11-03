/**
 * What a project changed about its copy of the workflow.
 *
 * `isModifiedFromTemplate` answers whether anything drifted; this says what, in
 * the words an admin needs before deciding to reset — because the cost of a
 * reset is exactly this list.
 */

import { matchKey } from "@/lib/workflow/matchKey";

type ProjectTask = { name: string | null };
type ProjectStep = {
	name: string;
	tasks: ProjectTask[];
	/** GDHUB-97: the step's own goal and text, null when it reads the template's. */
	goal?: string | null;
	content?: unknown;
};
type TemplateTask = { name: string };
type TemplateStep = { name: string; tasks?: TemplateTask[] };

export type LocalChange = {
	kind: "added" | "removed" | "moved" | "own";
	text: string;
};

export function diffFromTemplate(
	steps: ProjectStep[],
	template: TemplateStep[],
): LocalChange[] {
	// Nothing to compare against is not drift — it is an unknown, and claiming
	// changes here would offer a reset that restores nothing.
	if (!template.length) return [];

	const changes: LocalChange[] = [];
	const templateByName = new Map(
		template.map((step) => [matchKey(step.name), step]),
	);
	const projectByName = new Map(
		steps.map((step) => [matchKey(step.name), step]),
	);

	for (const step of steps) {
		const templateStep = templateByName.get(matchKey(step.name));
		if (!templateStep) {
			changes.push({
				kind: "added",
				text: `Step “${step.name}” was added manually`,
			});
			continue;
		}

		if (step.goal)
			changes.push({ kind: "own", text: `“${step.name}” has its own goal` });
		if (step.content)
			changes.push({
				kind: "own",
				text: `“${step.name}” has its own stage text`,
			});

		const templateTasks = new Set(
			(templateStep.tasks ?? []).map((task) => matchKey(task.name)),
		);
		const projectTasks = new Set(step.tasks.map((task) => matchKey(task.name)));

		for (const task of step.tasks) {
			if (!templateTasks.has(matchKey(task.name))) {
				changes.push({
					kind: "added",
					text: `Task “${task.name ?? "Untitled"}” was added to “${step.name}”`,
				});
			}
		}
		for (const task of templateStep.tasks ?? []) {
			if (!projectTasks.has(matchKey(task.name))) {
				changes.push({
					kind: "removed",
					text: `Task “${task.name}” was removed from “${step.name}”`,
				});
			}
		}
	}

	for (const templateStep of template) {
		if (!projectByName.has(matchKey(templateStep.name))) {
			changes.push({
				kind: "removed",
				text: `Step “${templateStep.name}” from the template is missing`,
			});
		}
	}

	// Order only counts as a change when both sides hold the same steps —
	// otherwise every add or remove would also report a reshuffle.
	const shared = steps
		.map((step) => matchKey(step.name))
		.filter((name) => templateByName.has(name));
	const sharedInTemplate = template
		.map((step) => matchKey(step.name))
		.filter((name) => projectByName.has(name));

	if (
		shared.length === sharedInTemplate.length &&
		shared.some((name, index) => name !== sharedInTemplate[index])
	) {
		changes.push({ kind: "moved", text: "Steps are in a different order" });
	}

	return changes;
}
