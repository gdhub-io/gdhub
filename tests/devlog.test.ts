import { describe, expect, it, vi } from "vitest";
import { prisma } from "../src/services/prisma";

vi.mock("../src/services/prisma", () => ({
	prisma: {
		projectReport: {
			findUnique: vi.fn(),
			getApplauseCount: vi.fn().mockResolvedValue(0),
			findFirst: vi.fn().mockResolvedValue(null),
		},
	},
}));

describe("GET /api/devlog/[projectReportId]", () => {
	it("returns a devlog post", async () => {
		const mockPost = {
			id: "post1",
			content: "content",
			publishedAt: "2024-01-01",
			video: null,
			project: {
				name: "Project",
				slug: "project",
				description: "desc",
				coverImage: null,
			},
			author: { name: "Author", image: null },
		};
		(prisma.projectReport.findUnique as any).mockResolvedValue(mockPost);

		const { GET } = await import(
			"../src/app/api/devlog/[projectReportId]/route"
		);

		const request = new Request("http://test/api/devlog/post1");
		const response = await (GET as any)(request, {
			params: Promise.resolve({ projectReportId: "post1" }),
		});

		expect(response.status).toBe(200);
		const json = await response.json();
		expect(json.id).toBe("post1");
	});
});
