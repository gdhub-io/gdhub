import { beforeEach, describe, expect, it } from "vitest";
import {
	applyResetPlan,
	type ResetWriter,
} from "@/services/workflow/applyResetPlan";
import { planReset, type ResetMode } from "@/services/workflow/planReset";

/**
 * The reset, from plan to rows.
 *
 * `workflow-reset.test.ts` checks what the plan decides; this checks what the
 * database ends up holding. Those went out of step once — the plan carried every
 * task and the writes lost them — so the two are worth testing separately.
 */

type StepRow = {
	id: string;
	name: string;
	order: number;
	done: boolean;
	projectWorkflowId: string;
};
type TaskRow = {
	id: string;
	stepId: string;
	name: string;
	done: boolean;
	order: number;
	required: boolean;
};

/** A store just real enough to answer "what is in there afterwards?". */
function fakeDb(steps: StepRow[] = [], tasks: TaskRow[] = []) {
	let seed = 0;
	const nextId = (prefix: string) => `${prefix}-new-${++seed}`;

	const writer: ResetWriter = {
		projectWorkflowStep: {
			async update({ where, data }) {
				const row = steps.find((step) => step.id === where.id);
				if (!row) throw new Error(`no step ${where.id}`);
				Object.assign(row, data);
				return row;
			},
			async create({ data }) {
				const row = { id: nextId("step"), ...data } as StepRow;
				steps.push(row);
				return row;
			},
		},
		projectWorkflowTask: {
			async update({ where, data }) {
				const row = tasks.find((task) => task.id === where.id);
				if (!row) throw new Error(`no task ${where.id}`);
				Object.assign(row, data);
				return row;
			},
			async create({ data }) {
				const row = { id: nextId("task"), ...data } as TaskRow;
				tasks.push(row);
				return row;
			},
			async deleteMany({ where }) {
				const stepId = where.stepId as string;
				const notIn = (where.id as { notIn?: string[] } | undefined)?.notIn;
				const survivors = tasks.filter(
					(task) =>
						task.stepId !== stepId || (notIn ? notIn.includes(task.id) : false),
				);
				const removed = tasks.length - survivors.length;
				tasks.length = 0;
				tasks.push(...survivors);
				return { count: removed };
			},
		},
	};

	return {
		writer,
		steps,
		tasks,
		/** What the route does after applying, with the tasks going by cascade. */
		deleteSteps: (ids: string[]) => {
			const doomed = new Set(ids);
			const keptSteps = steps.filter((step) => !doomed.has(step.id));
			const keptTasks = tasks.filter((task) => !doomed.has(task.stepId));
			steps.length = 0;
			steps.push(...keptSteps);
			tasks.length = 0;
			tasks.push(...keptTasks);
		},
		tasksOf: (stepName: string) => {
			const step = steps.find((row) => row.name === stepName);
			return tasks
				.filter((task) => task.stepId === step?.id)
				.sort((left, right) => left.order - right.order);
		},
	};
}

const template = [
	{
		name: "Concept",
		tasks: [
			{ name: "Write the pitch", required: true },
			{ name: "Fill the project card", required: false },
		],
	},
	{
		name: "Marketing push",
		tasks: [{ name: "Announce the demo", required: false }],
	},
];

let db: ReturnType<typeof fakeDb>;

/** A project on "Concept" with one task done, plus a step of its own. */
function seed() {
	return fakeDb(
		[
			{
				id: "s1",
				name: "Concept",
				order: 0,
				done: false,
				projectWorkflowId: "w1",
			},
			{
				id: "s2",
				name: "Playtest",
				order: 1,
				done: false,
				projectWorkflowId: "w1",
			},
		],
		[
			{
				id: "t1",
				stepId: "s1",
				name: "Write the pitch",
				done: true,
				order: 0,
				required: true,
			},
			{
				id: "t2",
				stepId: "s1",
				name: "Sketch the world",
				done: false,
				order: 1,
				required: false,
			},
			{
				id: "t3",
				stepId: "s2",
				name: "Run a session",
				done: true,
				order: 0,
				required: false,
			},
		],
	);
}

const run = async (mode: ResetMode, currentStepId: string | null = "s1") => {
	const existing = db.steps.map((step) => ({
		id: step.id,
		name: step.name,
		tasks: db.tasks
			.filter((task) => task.stepId === step.id)
			.map((task) => ({ id: task.id, name: task.name, done: task.done })),
	}));
	const plan = planReset(existing, template, mode, currentStepId);
	const surviving = await applyResetPlan(db.writer, "w1", plan, null);
	db.deleteSteps(plan.removedStepIds);
	return { plan, surviving };
};

beforeEach(() => {
	db = seed();
});

describe("applyResetPlan — keep completed tasks", () => {
	it("writes every task the template asks for", async () => {
		await run("keep");

		expect(db.tasksOf("Concept").map((task) => task.name)).toEqual([
			"Write the pitch",
			"Fill the project card",
		]);
		expect(db.tasksOf("Marketing push").map((task) => task.name)).toEqual([
			"Announce the demo",
		]);
	});

	it("keeps the completion of a task that exists in both", async () => {
		await run("keep");
		expect(db.tasksOf("Concept")[0]).toMatchObject({ id: "t1", done: true });
	});

	it("drops what the template no longer asks for", async () => {
		await run("keep");
		expect(db.tasks.some((task) => task.id === "t2")).toBe(false);
	});
});

describe("applyResetPlan — full reset", () => {
	it("writes the template's tasks and clears every completion", async () => {
		await run("full");

		expect(db.tasksOf("Concept")).toHaveLength(2);
		expect(db.tasks.every((task) => !task.done)).toBe(true);
	});

	it("leaves no step marked done once its tasks are cleared", async () => {
		await run("full");
		expect(db.steps.every((step) => !step.done)).toBe(true);
	});
});

describe("applyResetPlan — sync new only", () => {
	it("adds the missing tasks without touching the existing ones", async () => {
		await run("sync");

		expect(db.tasksOf("Concept").map((task) => task.name)).toEqual([
			"Write the pitch",
			"Sketch the world",
			"Fill the project card",
		]);
		expect(db.tasksOf("Playtest").map((task) => task.name)).toEqual([
			"Run a session",
		]);
	});

	it("loses no progress", async () => {
		await run("sync");
		expect(db.tasks.filter((task) => task.done)).toHaveLength(2);
	});
});

describe("applyResetPlan — the sweep", () => {
	/**
	 * The regression this file exists for: the clean-up used to run after the
	 * creates, with only the reused ids exempt, so freshly written tasks were
	 * deleted in the same transaction and a reset moved steps and nothing else.
	 */
	it("never deletes a task it just created", async () => {
		// Nothing matches by name, so every task in the plan is a fresh row.
		const unrelated = [
			{ name: "Concept", tasks: [{ name: "Something else", required: false }] },
		];
		const plan = planReset(
			[{ id: "s1", name: "Concept", tasks: [{ id: "t1", name: "Old", done: false }] }],
			unrelated,
			"full",
			"s1",
		);
		await applyResetPlan(db.writer, "w1", plan, null);

		expect(db.tasksOf("Concept").map((task) => task.name)).toEqual([
			"Something else",
		]);
	});

	it("reports the surviving steps in template order", async () => {
		const { surviving } = await run("keep");
		expect(surviving).toEqual(["s1", db.steps.at(-1)?.id]);
	});
});
