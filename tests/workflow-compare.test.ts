import { describe, expect, it } from "vitest";
import { isModifiedFromTemplate } from "@/services/workflow/compareToTemplate";

const template = [
	{ name: "Concept", tasks: [{ name: "Write the pitch" }] },
	{
		name: "Prototype",
		tasks: [{ name: "Upload a build" }, { name: "Collect feedback" }],
	},
];

const asProject = (steps: typeof template) =>
	steps.map((step) => ({
		name: step.name,
		tasks: step.tasks.map((task) => ({ name: task.name })),
	}));

describe("isModifiedFromTemplate", () => {
	it("an untouched copy is not modified", () => {
		expect(isModifiedFromTemplate(asProject(template), template)).toBe(false);
	});

	it("ignores case and surrounding space", () => {
		// A step renamed back to what it was is not drift, whatever the typing.
		const project = [
			{ name: " concept ", tasks: [{ name: "Write the pitch" }] },
			{
				name: "PROTOTYPE",
				tasks: [{ name: "Upload a build" }, { name: "Collect feedback" }],
			},
		];
		expect(isModifiedFromTemplate(project, template)).toBe(false);
	});

	it("notices a renamed step", () => {
		const project = asProject(template);
		project[1].name = "Vertical slice";
		expect(isModifiedFromTemplate(project, template)).toBe(true);
	});

	it("notices a reordered flow", () => {
		const project = asProject(template).reverse();
		expect(isModifiedFromTemplate(project, template)).toBe(true);
	});

	it("notices an added or removed step", () => {
		expect(
			isModifiedFromTemplate(
				[...asProject(template), { name: "Release", tasks: [] }],
				template,
			),
		).toBe(true);
		expect(isModifiedFromTemplate([asProject(template)[0]], template)).toBe(
			true,
		);
	});

	it("notices a task added, removed or renamed inside a step", () => {
		const renamed = asProject(template);
		renamed[1].tasks[0] = { name: "Upload a playable build" };
		expect(isModifiedFromTemplate(renamed, template)).toBe(true);

		const dropped = asProject(template);
		dropped[1].tasks.pop();
		expect(isModifiedFromTemplate(dropped, template)).toBe(true);
	});

	it("treats a project with no template steps as modified", () => {
		// Nothing to compare against means nothing a reset could restore.
		expect(isModifiedFromTemplate(asProject(template), [])).toBe(true);
	});
});
