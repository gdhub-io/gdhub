import { beforeEach, describe, expect, it, vi } from "vitest";
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
			getFeedPage: vi
				.fn()
				.mockResolvedValue({ items: [], nextCursor: null, hasMore: false }),
			getApplauseCounts: vi.fn().mockResolvedValue(new Map()),
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

describe("GET /api/devlogs", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(prisma.projectReport.getFeedPage as any).mockResolvedValue({
			items: [],
			nextCursor: null,
			hasMore: false,
		});
		(prisma.projectReport.getApplauseCounts as any).mockResolvedValue(new Map());
	});

	it("keeps early-stage projects and generated posts out of the global feed", async () => {
		const response = await callGet("http://test/api/devlogs");

		expect(response.status).toBe(200);
		expect(prisma.projectReport.getFeedPage).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { project: feedVisibleProjectFilter },
				// Generated posts are hidden by the package, not by a where clause.
				includeSystem: false,
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
		expect(prisma.projectReport.getFeedPage).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { projectId: "p3" },
				// A project's own devlog keeps its generated registration post.
				includeSystem: true,
			}),
		);
	});

	it("passes the client cursor through and returns the next one", async () => {
		(prisma.projectReport.getFeedPage as any).mockResolvedValue({
			items: [{ id: "r1" }],
			nextCursor: "cursor-2",
			hasMore: true,
		});

		const response = await callGet("http://test/api/devlogs?after=cursor-1");
		const body = await response.json();

		expect(prisma.projectReport.getFeedPage).toHaveBeenCalledWith(
			expect.objectContaining({ after: "cursor-1" }),
		);
		expect(body.nextCursor).toBe("cursor-2");
		expect(body.hasMore).toBe(true);
		expect(body.items[0].applauseCount).toBe(0);
	});
});
