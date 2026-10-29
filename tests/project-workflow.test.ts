import { beforeEach, describe, expect, it, vi } from "vitest";

type StepRow = {
	id: string;
	projectWorkflowId: string;
	name: string;
	order: number;
	finishedAt: Date | null;
	plannedAt: Date | null;
};
type TaskRow = { id: string; stepId: string; name: string };
type WorkflowRow = {
	id: string;
	projectId: string;
	currentStepId: string | null;
};

const TEMPLATE = [
	"Introduction",
	"Ideation",
	"Concepting",
	"Prototyping",
	"Preparing a demo version",
	"Taking and analyzing metrics",
	"Preparing a release version",
	"Support",
	"Project Completion",
].map((name, index) => ({
	name,
	tasks: index === 1 ? [{ name: "Fill in the project settings", required: true }] : [],
}));

const store = {
	workflows: [] as WorkflowRow[],
	steps: [] as StepRow[],
	tasks: [] as TaskRow[],
};
let seq = 0;
const nextId = (prefix: string) => `${prefix}-${++seq}`;

const stepsOf = (workflowId: string) =>
	store.steps
		.filter((step) => step.projectWorkflowId === workflowId)
		.sort((a, b) => a.order - b.order);

const db = {
	workflowSchema: {
		findUnique: vi.fn(async () => ({
			id: "schema-default",
			title: "Default",
			description: null,
			steps: TEMPLATE,
		})),
	},
	projectWorkflow: {
		findUnique: vi.fn(async ({ where }: { where: { projectId: string } }) => {
			const workflow = store.workflows.find(
				(row) => row.projectId === where.projectId,
			);
			return workflow ? { ...workflow, steps: stepsOf(workflow.id) } : null;
		}),
		create: vi.fn(async ({ data }: { data: { projectId: string } }) => {
			const row = { id: nextId("wf"), projectId: data.projectId, currentStepId: null };
			store.workflows.push(row);
			return { id: row.id };
		}),
		update: vi.fn(
			async ({
				where,
				data,
			}: {
				where: { id: string };
				data: { currentStepId: string };
			}) => {
				const row = store.workflows.find((workflow) => workflow.id === where.id);
				if (!row) throw new Error("no workflow");
				row.currentStepId = data.currentStepId;
				return row;
			},
		),
	},
	projectWorkflowStep: {
		create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
			const row: StepRow = {
				id: nextId("step"),
				projectWorkflowId: data.projectWorkflowId as string,
				name: data.name as string,
				order: data.order as number,
				finishedAt: null,
				plannedAt: null,
			};
			store.steps.push(row);
			return { id: row.id };
		}),
		update: vi.fn(
			async ({
				where,
				data,
			}: {
				where: { id: string };
				data: Partial<StepRow>;
			}) => {
				const row = store.steps.find((step) => step.id === where.id);
				if (!row) throw new Error("no step");
				Object.assign(row, data);
				return row;
			},
		),
		updateMany: vi.fn(
			async ({
				where,
				data,
			}: {
				where: { id: { in: string[] }; finishedAt: null };
				data: Partial<StepRow>;
			}) => {
				for (const row of store.steps) {
					if (where.id.in.includes(row.id) && row.finishedAt === null) {
						Object.assign(row, data);
					}
				}
			},
		),
	},
	projectWorkflowTask: {
		create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
			store.tasks.push({
				id: nextId("task"),
				stepId: data.stepId as string,
				name: data.name as string,
			});
		}),
		update: vi.fn(),
		deleteMany: vi.fn(),
	},
	$transaction: vi.fn(async (run: (tx: unknown) => unknown) => run(db)),
};

vi.mock("@/services/prisma", () => ({ prisma: db }));

const {
	createProjectWorkflow,
	ensureCheckpointStage,
	placeProjectOnStage,
	selectableStageNames,
} = await import("@/repositories/project/workflow");

const tx = db as never;
const NOW = new Date("2026-10-16T10:00:00Z");

/** A project as the project extension leaves it: the template, on its first stage. */
const seedOnFirstStage = (projectId: string) => {
	const workflow = { id: nextId("wf"), projectId, currentStepId: null as string | null };
	store.workflows.push(workflow);
	for (const [order, { name }] of TEMPLATE.entries()) {
		store.steps.push({
			id: nextId("step"),
			projectWorkflowId: workflow.id,
			name,
			order,
			finishedAt: null,
			plannedAt: null,
		});
	}
	workflow.currentStepId = stepsOf(workflow.id)[0].id;
	return workflow;
};

const currentName = (projectId: string) => {
	const workflow = store.workflows.find((row) => row.projectId === projectId);
	return store.steps.find((step) => step.id === workflow?.currentStepId)?.name;
};

const finishedNames = (projectId: string) => {
	const workflow = store.workflows.find((row) => row.projectId === projectId);
	return stepsOf(workflow?.id ?? "")
		.filter((step) => step.finishedAt)
		.map((step) => step.name);
};

beforeEach(() => {
	store.workflows = [];
	store.steps = [];
	store.tasks = [];
	vi.clearAllMocks();
});

describe("createProjectWorkflow", () => {
	it("copies the template with its tasks and lands on the chosen stage", async () => {
		const stage = await createProjectWorkflow(tx, "p1", "Prototyping", NOW);

		expect(stage.name).toBe("Prototyping");
		expect(currentName("p1")).toBe("Prototyping");
		expect(stepsOf(store.workflows[0].id).map((step) => step.name)).toEqual(
			TEMPLATE.map((step) => step.name),
		);
		expect(store.tasks).toHaveLength(1);
		expect(finishedNames("p1")).toEqual([
			"Introduction",
			"Ideation",
			"Concepting",
		]);
		const prototyping = store.steps.find((step) => step.name === "Prototyping");
		expect(prototyping?.finishedAt).toBeNull();
		expect(prototyping?.plannedAt).toEqual(NOW);
	});

	it("defaults to Ideation", async () => {
		await createProjectWorkflow(tx, "p1");

		expect(currentName("p1")).toBe("Ideation");
		expect(finishedNames("p1")).toEqual(["Introduction"]);
	});

	it("refuses Introduction and unknown stages before writing anything", async () => {
		await expect(createProjectWorkflow(tx, "p1", "Introduction")).rejects.toThrow(
			"first stage",
		);
		await expect(createProjectWorkflow(tx, "p1", "Nowhere")).rejects.toThrow(
			"Unknown workflow stage",
		);
		expect(store.workflows).toHaveLength(0);
	});
});

describe("placeProjectOnStage", () => {
	it("moves a new project off Introduction to the stage its author chose", async () => {
		seedOnFirstStage("p1");

		await placeProjectOnStage(tx, "p1", "concepting", NOW);

		expect(currentName("p1")).toBe("Concepting");
		expect(finishedNames("p1")).toEqual(["Introduction", "Ideation"]);
	});

	it("refuses Introduction", async () => {
		seedOnFirstStage("p1");

		await expect(placeProjectOnStage(tx, "p1", "Introduction")).rejects.toThrow();
		expect(currentName("p1")).toBe("Introduction");
	});
});

describe("selectableStageNames", () => {
	it("offers Ideation to Preparing a release version", async () => {
		await expect(selectableStageNames(tx)).resolves.toEqual([
			"Ideation",
			"Concepting",
			"Prototyping",
			"Preparing a demo version",
			"Taking and analyzing metrics",
			"Preparing a release version",
		]);
	});
});

describe("ensureCheckpointStage", () => {
	it("moves a project on Introduction to Ideation and finishes Introduction", async () => {
		seedOnFirstStage("p1");

		const stage = await ensureCheckpointStage("p1", NOW);

		expect(stage?.name).toBe("Ideation");
		expect(currentName("p1")).toBe("Ideation");
		expect(finishedNames("p1")).toEqual(["Introduction"]);
	});

	it("leaves a project further along where it is", async () => {
		const workflow = seedOnFirstStage("p1");
		const prototyping = stepsOf(workflow.id)[3];
		workflow.currentStepId = prototyping.id;

		await expect(ensureCheckpointStage("p1", NOW)).resolves.toEqual({
			id: prototyping.id,
			name: "Prototyping",
		});
		expect(db.projectWorkflow.update).not.toHaveBeenCalled();
		expect(db.projectWorkflowStep.updateMany).not.toHaveBeenCalled();
	});

	it("gives a project without a workflow the default one, on Ideation", async () => {
		const stage = await ensureCheckpointStage("p1", NOW);

		expect(stage?.name).toBe("Ideation");
		expect(store.workflows).toHaveLength(1);
		expect(finishedNames("p1")).toEqual(["Introduction"]);
	});

	it("answers null for a workflow with no stages", async () => {
		store.workflows.push({ id: "wf-empty", projectId: "p1", currentStepId: null });

		await expect(ensureCheckpointStage("p1", NOW)).resolves.toBeNull();
	});
});
