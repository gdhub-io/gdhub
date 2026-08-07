import { describe, expect, it } from "vitest";
import { planReset } from "@/services/workflow/planReset";

const existing = [
	{
		id: "s1",
		name: "Concept",
		tasks: [
			{ id: "t1", name: "Write the pitch", done: true },
			{ id: "t2", name: "Sketch the world", done: false },
		],
	},
	{
		id: "s2",
		name: "Playtest",
		tasks: [{ id: "t3", name: "Run a session", done: true }],
	},
];

const template = [
	{
		name: "Concept",
		tasks: [
			{ name: "Write the pitch", required: true },
			{ name: "Fill the project card" },
		],
	},
	{ name: "Marketing push", tasks: [{ name: "Announce the demo" }] },
];

describe("planReset — full", () => {
	it("replaces the workflow with the template and clears progress", () => {
		const plan = planReset(existing, template, "full");

		expect(plan.steps.map((step) => step.name)).toEqual([
			"Concept",
			"Marketing push",
		]);
		expect(plan.steps.flatMap((step) => step.tasks).every((t) => !t.done)).toBe(
			true,
		);
		expect(plan.summary.completedKept).toBe(0);
		expect(plan.summary.completedTotal).toBe(2);
	});

	it("drops the steps the template does not have", () => {
		const plan = planReset(existing, template, "full");
		expect(plan.removedStepIds).toEqual(["s2"]);
		expect(plan.summary.stepsRemoved).toEqual(["Playtest"]);
		expect(plan.summary.stepsAdded).toEqual(["Marketing push"]);
	});
});

describe("planReset — keep", () => {
	it("keeps a completed task that the template still asks for", () => {
		const plan = planReset(existing, template, "keep");
		const concept = plan.steps[0];

		expect(concept.id).toBe("s1");
		expect(concept.tasks[0]).toMatchObject({ id: "t1", done: true });
		// Added by the template, so it starts unfinished.
		expect(concept.tasks[1]).toMatchObject({ done: false });
		expect(concept.tasks[1].id).toBeUndefined();
	});

	it("reports the completed work a reset would discard", () => {
		const plan = planReset(existing, template, "keep");
		// "Run a session" was done, but its step is not in the template.
		expect(plan.summary.completedKept).toBe(1);
		expect(plan.summary.completedTotal).toBe(2);
		expect(plan.summary.tasksRemoved).toBe(2);
	});
});

describe("planReset — sync", () => {
	it("adds what is missing and removes nothing", () => {
		const plan = planReset(existing, template, "sync");

		expect(plan.removedStepIds).toEqual([]);
		expect(plan.summary.tasksRemoved).toBe(0);
		expect(plan.steps.map((step) => step.name)).toEqual([
			"Concept",
			"Playtest",
			"Marketing push",
		]);
	});

	it("leaves every completion where it was", () => {
		const plan = planReset(existing, template, "sync");
		const done = plan.steps
			.flatMap((step) => step.tasks)
			.filter((task) => task.done);

		expect(done).toHaveLength(2);
		expect(plan.summary.completedKept).toBe(plan.summary.completedTotal);
	});

	it("appends only the tasks the step is missing", () => {
		const plan = planReset(existing, template, "sync");
		expect(plan.steps[0].tasks.map((task) => task.name)).toEqual([
			"Write the pitch",
			"Sketch the world",
			"Fill the project card",
		]);
		expect(plan.summary.tasksAdded).toBe(2);
	});
});

describe("planReset — the current step", () => {
	it("stays put when the template still has that step", () => {
		const plan = planReset(existing, template, "keep", "s1");
		expect(plan.summary.currentStep).toEqual({ kept: true, name: "Concept" });
	});

	it("falls back to the first step when its own step is dropped", () => {
		// The project sat on "Playtest", which the template does not have.
		const plan = planReset(existing, template, "keep", "s2");
		expect(plan.summary.currentStep).toEqual({ kept: false, name: "Concept" });
	});

	it("always restarts from the first step on a full reset", () => {
		const plan = planReset(existing, template, "full", "s1");
		expect(plan.summary.currentStep).toEqual({ kept: false, name: "Concept" });
	});

	it("never moves the project when only syncing", () => {
		const plan = planReset(existing, template, "sync", "s2");
		expect(plan.summary.currentStep).toEqual({ kept: true, name: "Playtest" });
	});
});

describe("planReset — matching", () => {
	it("matches steps and tasks by name, ignoring case and spacing", () => {
		const plan = planReset(
			[
				{
					id: "s1",
					name: " concept ",
					tasks: [{ id: "t1", name: "WRITE THE PITCH", done: true }],
				},
			],
			template,
			"keep",
		);

		expect(plan.steps[0].id).toBe("s1");
		expect(plan.steps[0].tasks[0]).toMatchObject({ id: "t1", done: true });
	});
});
