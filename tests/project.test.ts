import { createMocks } from "node-mocks-http";
import { beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../src/pages/api/user/project";
import { prisma } from "../src/services/prisma";

vi.mock("@gdhub-io/gdhub-prisma/dist/client", () => ({
	default: {
		TeamMemberStatus: {
			Founder: "Founder",
		},
		ProjectStatus: {
			Approved: "Approved",
		},
		UserRole: {
			Author: "Author",
		},
	},
}));

vi.mock("../src/services/prisma", () => ({
	prisma: {
		user: { findUnique: vi.fn(), update: vi.fn() },
		project: { findUnique: vi.fn(), create: vi.fn() },
	},
}));

vi.mock("next-auth/next", () => ({
	getServerSession: vi.fn().mockImplementation((req, res, authOptions) => {
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

		const { req, res } = createMocks({
			method: "POST",
			url: "/api/user/project",
			body: { name: "Test Project", description: "Test Description", agree: true },
			user: {
				id: "user1",
				email: "test@example.com",
				name: "Test User",
				roles: ["Author"],
			},
		});

		req.user = {
			id: "user1",
			email: "test@example.com",
			name: "Test User",
			roles: ["Author"],
		};

		try {
			await handler(req as any, res as any);
		} catch (error: any) {
			console.error("Handler error:", error);
			console.error("Error stack:", error.stack);
		}

		console.log("Response status:", res._getStatusCode());
		console.log("Response body:", res._getData());
		console.log("Response headers:", res._getHeaders());

		expect(res._getStatusCode()).toBe(200);
		expect(prisma.project.create).toHaveBeenCalled();
	});
});
