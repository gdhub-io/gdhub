/**
 * Bringing a project's workflow back in line with a template.
 *
 * This is the destructive operation of the admin area, so the decision is made
 * here — as data, before anything is written — and the same plan drives both
 * the preview the admin confirms and the writes that follow. What you are shown
 * is therefore what happens, and the whole thing is testable without a database.
 */

export type ResetMode = "keep" | "sync" | "full";

export type ExistingTask = { id: string; name: string | null; done: boolean };
export type ExistingStep = {
	id: string;
	name: string;
	tasks: ExistingTask[];
};

export type TemplateTask = {
	name: string;
	description?: string;
	required?: boolean;
	condition?: PrismaJson.WorkflowTaskCondition;
};
export type TemplateStep = {
	name: string;
	description?: string;
	tasks?: TemplateTask[];
};

export type PlannedTask = {
	/** Present when an existing row is reused, absent when one is created. */
	id?: string;
	name: string;
	description?: string;
	required: boolean;
	done: boolean;
	condition?: PrismaJson.WorkflowTaskCondition;
};

export type PlannedStep = {
	id?: string;
	name: string;
	description?: string;
	tasks: PlannedTask[];
};

export type ResetPlan = {
	steps: PlannedStep[];
	/** Steps of the project that the plan drops. */
	removedStepIds: string[];
	summary: {
		stepsAdded: string[];
		stepsRemoved: string[];
		tasksAdded: number;
		tasksRemoved: number;
		completedKept: number;
		completedTotal: number;
		/**
		 * Where the project stands afterwards. `kept: false` means the project is
		 * sent back to another step — the one consequence a progress bar will not
		 * show you.
		 */
		currentStep: { kept: boolean; name: string | null };
	};
};

const key = (value: string | null | undefined) =>
	(value ?? "").trim().toLowerCase();

/**
 * Work out what a reset would do, without doing it.
 *
 * - `full` — the template, exactly, with every completion cleared. The project
 *   gets a clean copy of the path.
 * - `keep` — the template's shape, but a task that was completed and still
 *   exists under the same name in the same step stays completed. Work that the
 *   template no longer asks for is dropped, and the summary says how much.
 * - `sync` — additive only: steps and tasks the template has and the project
 *   lacks are appended. Nothing the project owns is removed or reset, which is
 *   the safe option for a project already under way.
 */
export function planReset(
	existing: ExistingStep[],
	template: TemplateStep[],
	mode: ResetMode,
	currentStepId?: string | null,
): ResetPlan {
	const completedTotal = existing.reduce(
		(total, step) => total + step.tasks.filter((task) => task.done).length,
		0,
	);
	const currentName =
		existing.find((step) => step.id === currentStepId)?.name ?? null;

	if (mode === "sync")
		return planSync(existing, template, completedTotal, currentName);

	const existingByName = new Map(
		existing.map((step) => [key(step.name), step]),
	);
	const usedStepIds = new Set<string>();
	const stepsAdded: string[] = [];
	let tasksAdded = 0;
	let tasksRemoved = 0;
	let completedKept = 0;

	const steps: PlannedStep[] = template.map((templateStep) => {
		const match = existingByName.get(key(templateStep.name));
		if (match) usedStepIds.add(match.id);
		else stepsAdded.push(templateStep.name);

		const existingTasks = new Map(
			(match?.tasks ?? []).map((task) => [key(task.name), task]),
		);
		const keptTaskIds = new Set<string>();

		const tasks: PlannedTask[] = (templateStep.tasks ?? []).map(
			(templateTask) => {
				const existingTask = existingTasks.get(key(templateTask.name));
				if (existingTask) keptTaskIds.add(existingTask.id);
				else tasksAdded++;

				const done = mode === "keep" ? Boolean(existingTask?.done) : false;
				if (done) completedKept++;

				return {
					id: existingTask?.id,
					name: templateTask.name,
					description: templateTask.description,
					required: Boolean(templateTask.required),
					done,
					condition: templateTask.condition,
				};
			},
		);

		tasksRemoved += (match?.tasks ?? []).filter(
			(task) => !keptTaskIds.has(task.id),
		).length;

		return {
			id: match?.id,
			name: templateStep.name,
			description: templateStep.description,
			tasks,
		};
	});

	const removed = existing.filter((step) => !usedStepIds.has(step.id));
	tasksRemoved += removed.reduce((total, step) => total + step.tasks.length, 0);

	// A full reset always sends the project back to the start; otherwise it only
	// moves if the step it was on is not in the template.
	const currentSurvives =
		mode === "keep" &&
		currentName !== null &&
		steps.some((step) => key(step.name) === key(currentName));

	return {
		steps,
		removedStepIds: removed.map((step) => step.id),
		summary: {
			stepsAdded,
			stepsRemoved: removed.map((step) => step.name),
			tasksAdded,
			tasksRemoved,
			completedKept,
			completedTotal,
			currentStep: {
				kept: currentSurvives,
				name: currentSurvives ? currentName : (steps[0]?.name ?? null),
			},
		},
	};
}

/** Additive reconciliation: the project keeps everything it already has. */
function planSync(
	existing: ExistingStep[],
	template: TemplateStep[],
	completedTotal: number,
	currentName: string | null,
): ResetPlan {
	const seen = new Set(existing.map((step) => key(step.name)));
	const stepsAdded: string[] = [];
	let tasksAdded = 0;

	const steps: PlannedStep[] = existing.map((step) => {
		const templateStep = template.find(
			(candidate) => key(candidate.name) === key(step.name),
		);
		const has = new Set(step.tasks.map((task) => key(task.name)));

		const missing = (templateStep?.tasks ?? []).filter(
			(task) => !has.has(key(task.name)),
		);
		tasksAdded += missing.length;

		return {
			id: step.id,
			name: step.name,
			tasks: [
				...step.tasks.map((task) => ({
					id: task.id,
					name: task.name ?? "",
					required: false,
					done: task.done,
				})),
				...missing.map((task) => ({
					name: task.name,
					description: task.description,
					required: Boolean(task.required),
					done: false,
					condition: task.condition,
				})),
			],
		};
	});

	for (const templateStep of template) {
		if (seen.has(key(templateStep.name))) continue;
		stepsAdded.push(templateStep.name);
		tasksAdded += templateStep.tasks?.length ?? 0;
		steps.push({
			name: templateStep.name,
			description: templateStep.description,
			tasks: (templateStep.tasks ?? []).map((task) => ({
				name: task.name,
				description: task.description,
				required: Boolean(task.required),
				done: false,
				condition: task.condition,
			})),
		});
	}

	return {
		steps,
		removedStepIds: [],
		summary: {
			stepsAdded,
			stepsRemoved: [],
			tasksAdded,
			tasksRemoved: 0,
			completedKept: completedTotal,
			completedTotal,
			// Nothing is removed, so the project cannot be moved off its step.
			currentStep: { kept: true, name: currentName },
		},
	};
}
