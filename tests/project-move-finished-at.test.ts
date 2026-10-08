import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const projectFindFirst = vi.fn();
const workflowUpdate = vi.fn();
const stepUpdate = vi.fn();
const stepFindFirst = vi.fn();

vi.mock("@/auth", () => ({ auth: () => authMock() }));
vi.mock("@/lib/space-guard", () => ({
	withSpaceGuard: () => (handler: unknown) => handler,
}));
vi.mock("@/services/workflow/recomputeStepTasks", () => ({
	recomputeStepTasks: async (tasks: unknown[]) => tasks,
}));
vi.mock("@/services/prisma", () => ({
	prisma: {
		project: { findFirst: (...a: unknown[]) => projectFindFirst(...a) },
		projectWorkflow: { update: (...a: unknown[]) => workflowUpdate(...a) },
		projectWorkflowStep: {
			update: (...a: unknown[]) => stepUpdate(...a),
			findFirst: (...a: unknown[]) => stepFindFirst(...a),
		},
	},
}));

const steps = [
	{ id: "s0", order: 0, plannedAt: new Date("2026-10-01"), tasks: [] },
	{ id: "s1", order: 1, plannedAt: new Date("2026-10-05"), tasks: [] },
	{ id: "s2", order: 2, plannedAt: null, tasks: [] },
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

const finishedWrites = () =>
	stepUpdate.mock.calls
		.map(([arg]) => arg as { where: { id: string }; data: Record<string, unknown> })
		.filter((arg) => "finishedAt" in arg.data);

beforeEach(() => {
	vi.clearAllMocks();
	authMock.mockResolvedValue({
		user: { id: "u1", roles: ["Member"], onboardingDone: true },
	});
	workflowUpdate.mockResolvedValue({});
	stepUpdate.mockResolvedValue({});
});

describe("moving the workflow dates the stage it leaves", () => {
	it("stamps the stage left behind when moving next", async () => {
		onStep(1);
		await put({ direction: "next" });

		const [write] = finishedWrites();
		expect(write.where.id).toBe("s1");
		expect(write.data.finishedAt).toBeInstanceOf(Date);
	});

	it("reopens the stage returned to when moving back", async () => {
		onStep(1);
		await put({ direction: "previous" });

		expect(finishedWrites()).toEqual([
			{ where: { id: "s0" }, data: { finishedAt: null } },
		]);
	});

	it("stamps the current stage when jumping forward to a target", async () => {
		onStep(0);
		stepFindFirst.mockResolvedValue(steps[2]);
		await put({ direction: "next", targetStepId: "s2" });

		expect(finishedWrites().map((write) => write.where.id)).toContain("s0");
	});
});
