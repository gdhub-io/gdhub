import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const projectFindFirst = vi.fn();
const setCurrentStep = vi.fn();
const checkpointFindFirst = vi.fn();

vi.mock("@/auth", () => ({ auth: () => authMock() }));
vi.mock("@/lib/space-guard", () => ({
	withSpaceGuard: () => (handler: unknown) => handler,
}));
vi.mock("@/services/workflow/recomputeStepTasks", () => ({
	recomputeStepTasks: async (tasks: unknown[]) => tasks,
}));
vi.mock("@/repositories/checkpoints/workflow-lock", () => ({
	stageMoveApproved: vi.fn(async () => true),
	runningCheckpointLock: (...a: unknown[]) => checkpointFindFirst(...a),
}));
vi.mock("@/repositories/project/workflow", () => ({
	setCurrentStep: (...a: unknown[]) => setCurrentStep(...a),
}));
vi.mock("@/services/prisma", () => ({
	prisma: {
		project: { findFirst: (...a: unknown[]) => projectFindFirst(...a) },
		$transaction: (run: (tx: unknown) => unknown) => run("tx"),
	},
}));

const steps = [
	{ id: "s0", projectWorkflowId: "wf1", order: 0, plannedAt: new Date("2026-10-01"), tasks: [] },
	{ id: "s1", projectWorkflowId: "wf1", order: 1, plannedAt: new Date("2026-10-05"), tasks: [] },
	{ id: "s2", projectWorkflowId: "wf1", order: 2, plannedAt: null, tasks: [] },
];

const onStep = (index: number) =>
	projectFindFirst.mockResolvedValue({
		workflow: {
			currentStep: { ...steps[index], equityPromises: [] },
			steps,
		},
	});

const put = async (body: Record<string, unknown>) => {
	const { PUT } = await import("@/app/api/project/move/route");
	const request = new NextRequest("http://localhost/api/project/move", {
		method: "PUT",
		body: JSON.stringify({ projectId: "p1", ...body }),
	});

	return (PUT as (r: NextRequest, c: unknown) => Promise<Response>)(request, {
		params: Promise.resolve({}),
	});
};

beforeEach(() => {
	vi.clearAllMocks();
	authMock.mockResolvedValue({
		user: { id: "u1", roles: ["Member"], onboardingDone: true },
	});
	setCurrentStep.mockResolvedValue({});
	checkpointFindFirst.mockResolvedValue(null);
});

describe("moving the workflow dates the stage it leaves", () => {
	it("moves to the next stage from the one it was on", async () => {
		onStep(1);
		await put({ direction: "next" });

		expect(setCurrentStep).toHaveBeenCalledWith("tx", "wf1", "s2", {
			from: "s1",
		});
	});

	it("never goes back, and never jumps", async () => {
		onStep(1);
		expect((await put({ direction: "previous" })).status).toBe(400);
		await put({ direction: "next", targetStepId: "s0" });

		expect(setCurrentStep).toHaveBeenCalledOnce();
		expect(setCurrentStep.mock.calls[0][2]).toBe("s2");
	});
});

describe("a running checkpoint holds the stage (GDHUB-37)", () => {
	it("refuses the move while a checkpoint is active or waiting for its verdict", async () => {
		onStep(1);
		checkpointFindFirst.mockResolvedValue({
			number: 3,
			stageName: "Concepting",
			dueAt: "2026-11-01T00:00:00.000Z",
		});

		const response = await put({ direction: "next" });

		expect(response.status).toBe(409);
		expect(setCurrentStep).not.toHaveBeenCalled();
		expect(checkpointFindFirst).toHaveBeenCalledWith("p1");
	});

	it("still asks for the stage's required tasks once no checkpoint runs", async () => {
		projectFindFirst.mockResolvedValue({
			workflow: {
				currentStep: {
					...steps[1],
					tasks: [{ required: true, done: false }],
					equityPromises: [],
				},
				steps,
			},
		});

		expect((await put({ direction: "next" })).status).toBe(400);
		expect(setCurrentStep).not.toHaveBeenCalled();
	});
});
