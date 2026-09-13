import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkflowTaskCondition } from "@/schemas/workflowTaskCondition";
import { prisma } from "@/services/prisma";
import { evaluateTaskCondition } from "@/services/workflow/evaluateTaskCondition";

vi.mock("@/services/prisma", () => ({
	prisma: {
		project: { findUnique: vi.fn() },
		projectReport: { count: vi.fn() },
		teamVacancy: { count: vi.fn() },
		teamMember: { count: vi.fn() },
		teamInvestor: { count: vi.fn() },
		projectArtifact: { count: vi.fn() },
		adviceRequest: { count: vi.fn() },
		projectEstimation: { count: vi.fn() },
		equityAllocation: { count: vi.fn() },
		applauseActivity: { count: vi.fn() },
	},
}));

const ctx = { projectId: "p1" };

beforeEach(() => {
	vi.clearAllMocks();
});

describe("evaluateTaskCondition — project_fields", () => {
	it("is done only when every listed field is filled", async () => {
		vi.mocked(prisma.project.findUnique).mockResolvedValue({
			name: "Neon Drift",
			description: "  ",
			genre: "Roguelike",
			coreMechanics: [],
		} as never);

		await expect(
			evaluateTaskCondition(
				{ source: "project_fields", fields: ["name", "genre"] },
				ctx,
			),
		).resolves.toBe(true);

		// description is whitespace-only -> not filled
		await expect(
			evaluateTaskCondition(
				{ source: "project_fields", fields: ["name", "description"] },
				ctx,
			),
		).resolves.toBe(false);

		// empty array field -> not filled
		await expect(
			evaluateTaskCondition(
				{ source: "project_fields", fields: ["coreMechanics"] },
				ctx,
			),
		).resolves.toBe(false);
	});

	it("is not done when the project is missing", async () => {
		vi.mocked(prisma.project.findUnique).mockResolvedValue(null as never);
		await expect(
			evaluateTaskCondition(
				{ source: "project_fields", fields: ["name"] },
				ctx,
			),
		).resolves.toBe(false);
	});
});

describe("evaluateTaskCondition — count sources", () => {
	it("devlog_posts: done when count reaches min", async () => {
		vi.mocked(prisma.projectReport.count).mockResolvedValue(1 as never);
		await expect(
			evaluateTaskCondition({ source: "devlog_posts", min: 2 }, ctx),
		).resolves.toBe(false);

		vi.mocked(prisma.projectReport.count).mockResolvedValue(3 as never);
		await expect(
			evaluateTaskCondition({ source: "devlog_posts", min: 2 }, ctx),
		).resolves.toBe(true);
	});

	it("devlog_posts: step scope filters by the current step id", async () => {
		vi.mocked(prisma.projectReport.count).mockResolvedValue(5 as never);
		await evaluateTaskCondition(
			{ source: "devlog_posts", min: 1, scope: "step" },
			{ projectId: "p1", stepId: "step-3" },
		);
		expect(prisma.projectReport.count).toHaveBeenCalledWith({
			where: { projectId: "p1", stepId: "step-3" },
		});
	});

	it("vacancies: scopes to the project team and applies status filter", async () => {
		vi.mocked(prisma.teamVacancy.count).mockResolvedValue(1 as never);
		const condition: WorkflowTaskCondition = {
			source: "vacancies",
			min: 1,
			status: "Published" as never,
		};
		await expect(evaluateTaskCondition(condition, ctx)).resolves.toBe(true);
		expect(prisma.teamVacancy.count).toHaveBeenCalledWith({
			where: { team: { projectId: "p1" }, status: "Published" },
		});
	});

	it("vacancies: step scope filters by promiseStepId", async () => {
		vi.mocked(prisma.teamVacancy.count).mockResolvedValue(1 as never);
		await evaluateTaskCondition(
			{ source: "vacancies", min: 1, scope: "step" },
			{ projectId: "p1", stepId: "step-3" },
		);
		expect(prisma.teamVacancy.count).toHaveBeenCalledWith({
			where: { team: { projectId: "p1" }, promiseStepId: "step-3" },
		});
	});

	it("artifacts: filters by artifact type", async () => {
		vi.mocked(prisma.projectArtifact.count).mockResolvedValue(2 as never);
		await evaluateTaskCondition(
			{ source: "artifacts", min: 1, type: "GDD" as never },
			ctx,
		);
		expect(prisma.projectArtifact.count).toHaveBeenCalledWith({
			where: { projectId: "p1", type: "GDD" },
		});
	});

	it("equity_allocations: scopes through project equity", async () => {
		vi.mocked(prisma.equityAllocation.count).mockResolvedValue(3 as never);
		await evaluateTaskCondition(
			{ source: "equity_allocations", min: 3 },
			ctx,
		);
		expect(prisma.equityAllocation.count).toHaveBeenCalledWith({
			where: { equity: { projectId: "p1" } },
		});
	});

	it("applause: done when collected applause reaches min", async () => {
		vi.mocked(prisma.applauseActivity.count).mockResolvedValue(10 as never);
		await expect(
			evaluateTaskCondition({ source: "applause", min: 10 }, ctx),
		).resolves.toBe(true);
	});

	it("links: counts the project links array", async () => {
		vi.mocked(prisma.project.findUnique).mockResolvedValue({
			links: [{ url: "a" }, { url: "b" }],
		} as never);
		await expect(
			evaluateTaskCondition({ source: "links", min: 2 }, ctx),
		).resolves.toBe(true);
		await expect(
			evaluateTaskCondition({ source: "links", min: 3 }, ctx),
		).resolves.toBe(false);
	});
});
