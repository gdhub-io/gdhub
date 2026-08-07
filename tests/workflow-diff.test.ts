import { describe, expect, it } from "vitest";
import { diffFromTemplate } from "@/services/workflow/diffFromTemplate";

const template = [
	{ name: "Concept", tasks: [{ name: "Write the pitch" }] },
	{
		name: "Release",
		tasks: [{ name: "Write a press kit" }, { name: "Ship the build" }],
	},
];

const asProject = () =>
	template.map((step) => ({
		name: step.name,
		tasks: step.tasks.map((task) => ({ name: task.name })),
	}));

describe("diffFromTemplate", () => {
	it("says nothing about an untouched copy", () => {
		expect(diffFromTemplate(asProject(), template)).toEqual([]);
	});

	it("names a step the project added itself", () => {
		const project = [...asProject(), { name: "Playtest", tasks: [] }];
		expect(diffFromTemplate(project, template)).toContainEqual({
			kind: "added",
			text: "Step “Playtest” was added manually",
		});
	});

	it("names a task the project dropped", () => {
		const project = asProject();
		project[1].tasks.shift();
		expect(diffFromTemplate(project, template)).toContainEqual({
			kind: "removed",
			text: "Task “Write a press kit” was removed from “Release”",
		});
	});

	it("names a task the project added", () => {
		const project = asProject();
		project[0].tasks.push({ name: "Record a teaser" });
		expect(diffFromTemplate(project, template)).toContainEqual({
			kind: "added",
			text: "Task “Record a teaser” was added to “Concept”",
		});
	});

	it("names a template step the project never got", () => {
		const project = [asProject()[0]];
		expect(diffFromTemplate(project, template)).toContainEqual({
			kind: "removed",
			text: "Step “Release” from the template is missing",
		});
	});

	it("reports a reshuffle only when both sides hold the same steps", () => {
		const reordered = asProject().reverse();
		expect(diffFromTemplate(reordered, template)).toEqual([
			{ kind: "moved", text: "Steps are in a different order" },
		]);

		// A removal already explains the changed sequence; saying "reordered" too
		// would double-count one edit.
		const shortened = [asProject()[0]];
		expect(
			diffFromTemplate(shortened, template).some((c) => c.kind === "moved"),
		).toBe(false);
	});

	it("stays silent when there is no template to compare against", () => {
		expect(diffFromTemplate(asProject(), [])).toEqual([]);
	});
});
