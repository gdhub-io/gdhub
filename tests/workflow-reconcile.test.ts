import { describe, expect, it } from "vitest";
import {
	WorkflowStepsInputSchema,
	WorkflowStepsTemplateSchema,
} from "@/schemas/workflow";
import {
	planSteps,
	planTasks,
	resolveCurrentStepId,
} from "@/services/workflow/reconcile";

const existing = [
	{ id: "s1", tasks: [{ id: "t1" }, { id: "t2" }] },
	{ id: "s2", tasks: [{ id: "t3" }] },
	{ id: "s3", tasks: [] },
];

describe("workflow steps payload", () => {
	// The wipe we are guarding against: a form that had not loaded yet posted an
	// empty list, the server read it as "delete everything", and the project was
	// left with no workflow at all.
	it("rejects an empty list instead of reading it as delete-everything", () => {
		expect(WorkflowStepsInputSchema.safeParse([]).success).toBe(false);
	});

	it("rejects a step whose id is an empty string", () => {
		const result = WorkflowStepsInputSchema.safeParse([
			{ id: "", name: "Concept" },
		]);
		expect(result.success).toBe(false);
	});

	it("accepts a step with no id — that is how a new step arrives", () => {
		const result = WorkflowStepsInputSchema.safeParse([{ name: "Concept" }]);
		expect(result.success).toBe(true);
	});
});

describe("workflow template payload", () => {
	// The template's steps are one JSON column: an empty array does not clear a
	// list, it blanks the source every future project is created from.
	it("rejects an empty template", () => {
		expect(WorkflowStepsTemplateSchema.safeParse([]).success).toBe(false);
	});

	it("requires a task list on every step", () => {
		expect(
			WorkflowStepsTemplateSchema.safeParse([{ name: "Concept" }]).success,
		).toBe(false);
	});

	it("accepts the shape the column declares", () => {
		const result = WorkflowStepsTemplateSchema.safeParse([
			{
				name: "Concept",
				description: "Shape the idea",
				tasks: [
					{ name: "Write the pitch", required: true },
					{
						name: "Fill the project card",
						required: false,
						condition: { source: "project_fields", fields: ["name", "genre"] },
					},
				],
			},
		]);
		expect(result.success).toBe(true);
	});
});

describe("planSteps", () => {
	it("renaming one step touches only that step", () => {
		const plan = planSteps(
			[
				{ id: "s1", name: "Renamed" },
				{ id: "s2", name: "Two" },
				{ id: "s3", name: "Three" },
			],
			existing,
		);

		expect(plan.deleteIds).toEqual([]);
		expect(plan.create).toEqual([]);
		expect(plan.update.map((u) => u.id)).toEqual(["s1", "s2", "s3"]);
	});

	it("reordering rewrites the order and deletes nothing", () => {
		const plan = planSteps(
			[{ id: "s3" }, { id: "s1" }, { id: "s2" }],
			existing,
		);

		expect(plan.deleteIds).toEqual([]);
		expect(plan.update.map((u) => [u.id, u.order])).toEqual([
			["s3", 0],
			["s1", 1],
			["s2", 2],
		]);
	});

	it("adds a step without disturbing the others", () => {
		const plan = planSteps(
			[{ id: "s1" }, { id: "s2" }, { id: "s3" }, { name: "Release" }],
			existing,
		);

		expect(plan.deleteIds).toEqual([]);
		expect(plan.create).toHaveLength(1);
		expect(plan.create[0].order).toBe(3);
	});

	it("deletes only what the payload leaves out", () => {
		const plan = planSteps([{ id: "s1" }, { id: "s3" }], existing);

		expect(plan.deleteIds).toEqual(["s2"]);
		expect(plan.update.map((u) => u.id)).toEqual(["s1", "s3"]);
	});

	it("treats an unknown id as a new step, never as an update", () => {
		// A stale editor can hold ids from another workflow. Updating by such an
		// id would rewrite a step this workflow does not own.
		const plan = planSteps(
			[{ id: "s1" }, { id: "from-another-workflow", name: "Foreign" }],
			existing,
		);

		expect(plan.update.map((u) => u.id)).toEqual(["s1"]);
		expect(plan.create).toHaveLength(1);
		expect(plan.deleteIds).toEqual(["s2", "s3"]);
	});
});

describe("planTasks", () => {
	it("keeps the tasks the payload still carries", () => {
		const plan = planTasks(
			[{ id: "t2" }, { id: "t1" }, { name: "New task" }],
			existing[0].tasks,
		);

		expect(plan.deleteIds).toEqual([]);
		expect(plan.update.map((u) => [u.id, u.order])).toEqual([
			["t2", 0],
			["t1", 1],
		]);
		expect(plan.create).toHaveLength(1);
	});

	it("drops a task only when it is left out", () => {
		const plan = planTasks([{ id: "t1" }], existing[0].tasks);
		expect(plan.deleteIds).toEqual(["t2"]);
	});
});

describe("resolveCurrentStepId", () => {
	it("keeps the requested step when it survives", () => {
		expect(resolveCurrentStepId("s2", ["s1", "s2"], "s1")).toBe("s2");
	});

	it("falls back to the previous step when the requested one is gone", () => {
		expect(resolveCurrentStepId("deleted", ["s1", "s2"], "s1")).toBe("s1");
	});

	it("clears the pointer rather than leaving it dangling", () => {
		// A current step that no longer exists is the same broken state as no
		// workflow: the project page has no stage to show.
		expect(resolveCurrentStepId("deleted", ["s1"], "also-deleted")).toBe(null);
	});
});
