import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../src/services/prisma";

vi.mock("@gdhub-io/gdhub-prisma", () => ({
	TeamMemberStatus: {
		Founder: "Founder",
	},
	ProjectStatus: {
		Approved: "Approved",
	},
	UserRole: {
		Author: "Author",
	},
}));

vi.mock("../src/services/prisma", () => ({
	prisma: {
		user: { findUnique: vi.fn(), update: vi.fn() },
		project: { findUnique: vi.fn(), create: vi.fn() },
	},
}));

vi.mock("next-auth/next", () => ({
	getServerSession: vi.fn().mockImplementation(() => {
		return Promise.resolve({
			user: {
				id: "user1",
				email: "test@example.com",
				name: "Test User",
				roles: ["Author"],
			},
		});
	}),
}));

vi.mock("@/auth", () => ({
	auth: vi.fn().mockImplementation(() =>
		Promise.resolve({
			user: {
				id: "user1",
				email: "test@example.com",
				name: "Test User",
				roles: ["Author"],
			},
		}),
	),
}));

describe("POST /api/user/project", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("creates a new project", async () => {
		(prisma.user.findUnique as any).mockResolvedValue({
			id: "user1",
			specialities: [{ id: "spec1" }],
			memberInTeams: [],
		});
		(prisma.project.findUnique as any).mockResolvedValue(null);
		(prisma.project.create as any).mockResolvedValue({
			id: "p1",
			slug: "test-project",
			author: { roles: [] },
		});

		const { POST } = await import("../src/app/api/user/project/route");
		const request = new Request("http://test/api/user/project", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				name: "Test Project",
				description: "Test Description",
				agree: true,
			}),
		});
		const { NextRequest } = await import("next/server");
		const nextReq = new NextRequest(request);

		let response: Response | undefined;
		try {
			response = await (POST as any)(nextReq, { params: Promise.resolve({}) });
		} catch (error: any) {
			console.error("Handler error:", error);
			console.error("Error stack:", error.stack);
		}

		const status = response?.status;
		const body = response ? await response.text() : undefined;
		console.info("Response status:", status);
		console.info("Response body:", body);

		expect(status).toBe(200);
		expect(prisma.project.create).toHaveBeenCalled();
	});
});
