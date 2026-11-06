import { beforeEach, describe, expect, it, vi } from "vitest";

const projectFindFirst = vi.fn();
const projectFindMany = vi.fn();
const artifactFindMany = vi.fn();
const checkpointUpdate = vi.fn();
const checkpointDelete = vi.fn();
const createDraftCheckpoint = vi.fn();
const assignCurator = vi.fn();
const getCreationBlocker = vi.fn();
const userFindUnique = vi.fn();
const setCurrentStep = vi.fn();
const auditCreate = vi.fn();

vi.mock("@/services/prisma", () => ({
	prisma: {
		project: {
			findFirst: (...a: unknown[]) => projectFindFirst(...a),
			findMany: (...a: unknown[]) => projectFindMany(...a),
		},
		projectArtifact: { findMany: (...a: unknown[]) => artifactFindMany(...a) },
		user: { findUnique: (...a: unknown[]) => userFindUnique(...a) },
		projectCheckpoint: {
			update: (...a: unknown[]) => checkpointUpdate(...a),
			delete: (...a: unknown[]) => checkpointDelete(...a),
		},
		auditLog: { create: (...a: unknown[]) => auditCreate(...a) },
		$transaction: (run: (tx: unknown) => unknown) => run("tx"),
	},
}));
vi.mock("@/repositories/project/workflow", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/repositories/project/workflow")>()),
	setCurrentStep: (...a: unknown[]) => setCurrentStep(...a),
}));
vi.mock("@/repositories/checkpoints/checkpoint", () => ({
	createDraftCheckpoint: (...a: unknown[]) => createDraftCheckpoint(...a),
	getCreationBlocker: (...a: unknown[]) => getCreationBlocker(...a),
}));
vi.mock("@/services/checkpoints/flows/admin", () => ({
	assignCurator: (...a: unknown[]) => assignCurator(...a),
}));

const { freeCheckpointProjects } = await import(
	"@/repositories/checkpoints/free"
);
const { startFreeCheckpoint } = await import(
	"@/services/checkpoints/flows/free"
);

beforeEach(() => {
	vi.clearAllMocks();
	projectFindFirst.mockResolvedValue({ id: "p1" });
	createDraftCheckpoint.mockResolvedValue({
		id: "cp1",
		stageName: "Prototyping",
		items: [],
	});
	artifactFindMany.mockResolvedValue([]);
	assignCurator.mockResolvedValue({ ok: true });
	getCreationBlocker.mockResolvedValue(null);
	userFindUnique.mockResolvedValue({ id: "u1" });
});

const ai = { projectId: "p1", kind: "AI" as const, reason: "Partner studio" };

describe("freeCheckpointProjects", () => {
	it("offers only live projects past Introduction with nothing under way, drafts included", async () => {
		projectFindMany.mockResolvedValue([]);
		await freeCheckpointProjects("tide");
		const { where } = projectFindMany.mock.calls[0][0];
		expect(where.status.notIn).toEqual(
			expect.arrayContaining(["Archived", "Rejected"]),
		);
		expect(where.workflow.currentStep.name.notIn).toContain("Introduction");
		expect(where.checkpoints.none.status.in).toEqual(
			expect.arrayContaining(["Draft", "AwaitingCurator", "Active", "Review"]),
		);
		expect(where.name).toEqual({ contains: "tide", mode: "insensitive" });
	});
});

describe("startFreeCheckpoint", () => {
	it("refuses a project that cannot take one", async () => {
		projectFindFirst.mockResolvedValue(null);
		await expect(startFreeCheckpoint("admin", ai)).resolves.toEqual({
			ok: false,
			error: "notEligible",
		});
		expect(createDraftCheckpoint).not.toHaveBeenCalled();
	});

	it("is given while sales are closed, but not beside a checkpoint under way", async () => {
		getCreationBlocker.mockResolvedValue({ reason: "purchaseClosed" });
		await expect(startFreeCheckpoint("admin", ai)).resolves.toMatchObject({
			ok: true,
		});
		getCreationBlocker.mockResolvedValue({ reason: "checkpointOpen" });
		await expect(startFreeCheckpoint("admin", ai)).resolves.toEqual({
			ok: false,
			error: "notEligible",
		});
	});

	it("checks the person before making a draft", async () => {
		userFindUnique.mockResolvedValue(null);
		await expect(
			startFreeCheckpoint("admin", {
				...ai,
				kind: "Human",
				userId: "ghost",
				firstCall: new Date(),
			}),
		).resolves.toEqual({ ok: false, error: "curatorMissing" });
		expect(createDraftCheckpoint).not.toHaveBeenCalled();
	});

	it("removes the draft when starting it throws", async () => {
		assignCurator.mockRejectedValue(new Error("model down"));
		await expect(startFreeCheckpoint("admin", ai)).rejects.toThrow("model down");
		expect(checkpointDelete).toHaveBeenCalledWith({ where: { id: "cp1" } });
	});

	it("needs a first call for a person", async () => {
		await expect(
			startFreeCheckpoint("admin", { ...ai, kind: "Human", userId: "u1" }),
		).resolves.toEqual({ ok: false, error: "firstCallMissing" });
	});

	it("gives the stage's goal and the project's artifacts as inputs, then hands it over", async () => {
		artifactFindMany.mockResolvedValue([
			{ id: "a1", name: "Concept document", type: "Document" },
		]);
		await expect(startFreeCheckpoint("admin", ai)).resolves.toEqual({
			ok: true,
			checkpointId: "cp1",
		});
		const { data } = checkpointUpdate.mock.calls[0][0];
		expect(data.goal).toBe("Do what the Prototyping stage asks for");
		expect(data.items.create).toEqual([
			{
				kind: "Input",
				order: 1,
				text: "Concept document",
				evidence: { create: { artifactId: "a1" } },
			},
		]);
		expect(assignCurator).toHaveBeenCalledWith("cp1", "admin", {
			kind: "AI",
			reason: "Partner studio",
		});
	});

	it("keeps inputs carried from the last checkpoint, and books a person from the first call", async () => {
		createDraftCheckpoint.mockResolvedValue({
			id: "cp1",
			stageName: "Prototyping",
			items: [{ kind: "Input" }],
		});
		const firstCall = new Date("2026-11-02T15:00:00Z");
		await startFreeCheckpoint("admin", {
			...ai,
			kind: "Human",
			userId: "u1",
			firstCall,
		});
		const { data } = checkpointUpdate.mock.calls[0][0];
		expect(data.items).toBeUndefined();
		expect(data.startedAt).toEqual(firstCall);
	});

	it("leaves no draft behind when the curator cannot take it", async () => {
		assignCurator.mockResolvedValue({ ok: false, error: "slotTaken" });
		await expect(
			startFreeCheckpoint("admin", {
				...ai,
				kind: "Human",
				userId: "u1",
				firstCall: new Date(),
			}),
		).resolves.toEqual({ ok: false, error: "slotTaken" });
		expect(checkpointDelete).toHaveBeenCalledWith({ where: { id: "cp1" } });
	});
});

describe("the stage a free checkpoint runs on", () => {
	const onIdeation = {
		workflow: {
			id: "wf1",
			currentStep: { id: "s-idea", name: "Ideation" },
			steps: [
				{ id: "s-intro", name: "Introduction" },
				{ id: "s-idea", name: "Ideation" },
				{ id: "s-proto", name: "Prototyping" },
			],
		},
	};

	beforeEach(() => projectFindFirst.mockResolvedValue(onIdeation));

	it("moves the project to the stage the admin picked, before the draft opens, and audits it", async () => {
		const result = await startFreeCheckpoint("admin", { ...ai, stepId: "s-proto" });

		expect(result).toEqual({ ok: true, checkpointId: "cp1" });
		expect(setCurrentStep).toHaveBeenCalledWith("tx", "wf1", "s-proto");
		expect(setCurrentStep.mock.invocationCallOrder[0]).toBeLessThan(
			createDraftCheckpoint.mock.invocationCallOrder[0],
		);
		expect(auditCreate).toHaveBeenCalledWith({
			data: expect.objectContaining({
				meta: expect.objectContaining({
					stageMovedFrom: "Ideation",
					stageMovedTo: "Prototyping",
				}),
			}),
		});
	});

	it("leaves the stage alone when the admin keeps the current one", async () => {
		await startFreeCheckpoint("admin", { ...ai, stepId: "s-idea" });

		expect(setCurrentStep).not.toHaveBeenCalled();
		expect(auditCreate).not.toHaveBeenCalled();
	});

	it.each([
		["Introduction", "s-intro"],
		["a stage of another project", "s-elsewhere"],
	])("refuses %s, with no draft made", async (_label, stepId) => {
		await expect(
			startFreeCheckpoint("admin", { ...ai, stepId }),
		).resolves.toEqual({ ok: false, error: "stageInvalid" });
		expect(setCurrentStep).not.toHaveBeenCalled();
		expect(createDraftCheckpoint).not.toHaveBeenCalled();
	});
});
