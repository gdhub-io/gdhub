import { beforeEach, describe, expect, it, vi } from "vitest";
import { nonSystemDevlogFilter } from "../src/config/devlog";
import { prisma } from "../src/services/prisma";
import {
	feedVisibleProjectFilter,
	MINIMUM_FEED_STAGE_ORDER,
	WorkflowStageOrder,
} from "../src/services/prisma/queries";

vi.mock("../src/services/prisma", () => ({
	prisma: {
		projectReport: {
			findMany: vi.fn().mockResolvedValue([]),
			getApplauseCount: vi.fn().mockResolvedValue(0),
		},
	},
}));

vi.mock("@/auth", () => ({
	auth: vi.fn().mockResolvedValue(null),
}));

const callGet = async (url: string) => {
	const { GET } = await import("../src/app/api/devlogs/route");
	return (GET as any)(new Request(url), { params: Promise.resolve({}) });
};

describe("GET /api/landing/project-reports", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(prisma.projectReport.findMany as any).mockResolvedValue([]);
	});

	it("keeps generated posts out of the landing section", async () => {
		const { GET } = await import("../src/app/api/landing/project-reports/route");
		const response = await (GET as any)();

		expect(response.status).toBe(200);
		expect(prisma.projectReport.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining(nonSystemDevlogFilter),
			}),
		);
	});
});

describe("GET /api/devlogs", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(prisma.projectReport.findMany as any).mockResolvedValue([]);
		(prisma.projectReport.getApplauseCount as any).mockResolvedValue(0);
	});

	it("keeps early-stage projects and generated posts out of the global feed", async () => {
		const response = await callGet("http://test/api/devlogs");

		expect(response.status).toBe(200);
		expect(prisma.projectReport.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					project: feedVisibleProjectFilter,
					...nonSystemDevlogFilter,
				},
			}),
		);
		expect(MINIMUM_FEED_STAGE_ORDER).toBe(WorkflowStageOrder.Ideation);
		expect(feedVisibleProjectFilter.workflow.is.currentStep.is.order.gte).toBe(
			MINIMUM_FEED_STAGE_ORDER,
		);
	});

	it("does not filter by stage when a project is requested explicitly", async () => {
		const response = await callGet("http://test/api/devlogs?projectId=p3");

		expect(response.status).toBe(200);
		expect(prisma.projectReport.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: { projectId: "p3" } }),
		);
	});
});
