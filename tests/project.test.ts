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
	// `withAuth` runs every handler inside an audit context.
	withAuditContext: (_context: unknown, callback: () => unknown) => callback(),
}));

const placeProjectOnStage = vi.fn();
const limitAiCalls = vi.fn();
const validate = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
	limitAiCalls: (...args: unknown[]) => limitAiCalls(...args),
}));
vi.mock("@/services/ai-validation", () => ({
	aiValidation: { validate: (...args: unknown[]) => validate(...args) },
}));

vi.mock("@/repositories/project/workflow", () => ({
	DEFAULT_PROJECT_STAGE: "Ideation",
	selectableStageNames: async () => [
		"Ideation",
		"Concepting",
		"Prototyping",
		"Preparing a demo version",
		"Taking and analyzing metrics",
		"Preparing a release version",
	],
	placeProjectOnStage: (_tx: unknown, projectId: string, stage: string) =>
		placeProjectOnStage(projectId, stage),
}));

vi.mock("../src/services/prisma", () => ({
	prisma: {
		$transaction: (run: (tx: unknown) => unknown) => run({}),
		user: { findUnique: vi.fn(), update: vi.fn() },
		project: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
		// Creating a project now also records its owner in SpaceMember.
		spaceMember: { upsert: vi.fn(), findUnique: vi.fn() },
		legalAcceptance: { createMany: vi.fn() },
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

const postProject = async (body: Record<string, unknown>) => {
	const { POST } = await import("../src/app/api/user/project/route");
	const { NextRequest } = await import("next/server");
	const request = new NextRequest("http://test/api/user/project", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			name: "Test Project",
			description: "Test Description",
			legal: [{ code: "ProjectRequirements", version: 1 }],
			understandsNotAi: true,
			...body,
		}),
	});

	return (POST as any)(request, { params: Promise.resolve({}) }) as Promise<Response>;
};

describe("POST /api/user/project", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		limitAiCalls.mockResolvedValue(null);
		validate.mockResolvedValue({ ok: true });
		placeProjectOnStage.mockImplementation(async (_id, stage) => ({
			id: "step",
			name: stage,
		}));
	});

	describe("genre and stage", () => {
		beforeEach(() => {
			(prisma.user.findUnique as any).mockResolvedValue({
				id: "user1",
				specialities: [{ id: "spec1" }],
			});
			(prisma.project.findMany as any).mockResolvedValue([]);
			(prisma.project.create as any).mockResolvedValue({
				id: "p1",
				slug: "test-project",
			});
		});

		it("stores the genre and puts the project on Ideation by default", async () => {
			const response = await postProject({ genre: "Puzzle" });

			expect(response.status).toBe(200);
			expect((prisma.project.create as any).mock.calls[0][0].data.genre).toBe(
				"Puzzle",
			);
			expect(placeProjectOnStage).toHaveBeenCalledWith("p1", "Ideation");
			expect(await response.json()).toMatchObject({ stage: "Ideation" });
		});

		it("puts the project on the stage its author chose", async () => {
			const response = await postProject({ stage: "Prototyping" });

			expect(response.status).toBe(200);
			expect(placeProjectOnStage).toHaveBeenCalledWith("p1", "Prototyping");
		});

		it.each(["Introduction", "Support", "Project Completion", "Nowhere"])(
			"refuses %s before creating anything",
			async (stage) => {
				const response = await postProject({ stage });

				expect(response.status).toBe(400);
				expect(prisma.project.create).not.toHaveBeenCalled();
				expect(placeProjectOnStage).not.toHaveBeenCalled();
			},
		);
	});

	it("creates a new project", async () => {
		(prisma.user.findUnique as any).mockResolvedValue({
			id: "user1",
			specialities: [{ id: "spec1" }],
			memberInTeams: [],
		});
		(prisma.project.findMany as any).mockResolvedValue([]);
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
				legal: [{ code: "ProjectRequirements", version: 1 }],
				understandsNotAi: true,
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
		expect((prisma.project.create as any).mock.calls[0][0].data.slug).toBe(
			"test-project",
		);
	});

	it("suffixes the slug when the name is already taken", async () => {
		(prisma.user.findUnique as any).mockResolvedValue({
			id: "user1",
			specialities: [{ id: "spec1" }],
		});
		(prisma.project.findMany as any).mockResolvedValue([
			{ slug: "test-project" },
			{ slug: "test-project-2" },
			{ slug: "test-project-remake" },
		]);
		(prisma.project.create as any).mockResolvedValue({
			id: "p2",
			slug: "test-project-3",
			author: { roles: [] },
		});

		const { POST } = await import("../src/app/api/user/project/route");
		const request = new Request("http://test/api/user/project", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				name: "Test Project",
				description: "Test Description",
				legal: [{ code: "ProjectRequirements", version: 1 }],
				understandsNotAi: true,
			}),
		});
		const { NextRequest } = await import("next/server");
		const nextReq = new NextRequest(request);

		const response = await (POST as any)(nextReq, {
			params: Promise.resolve({}),
		});

		expect(response.status).toBe(200);
		const { data } = (prisma.project.create as any).mock.calls[0][0];
		expect(data.slug).toBe("test-project-3");
		expect(data.team.create.name).toBe("test-project-3's Team");
	});

	it("falls back to a random suffix when the slug is taken mid-flight", async () => {
		(prisma.user.findUnique as any).mockResolvedValue({
			id: "user1",
			specialities: [{ id: "spec1" }],
		});
		(prisma.project.findMany as any).mockResolvedValue([]);
		(prisma.project.create as any)
			.mockRejectedValueOnce(Object.assign(new Error("unique"), {
				code: "P2002",
			}))
			.mockResolvedValueOnce({
				id: "p3",
				slug: "test-project-abc123",
				author: { roles: [] },
			});

		const { POST } = await import("../src/app/api/user/project/route");
		const request = new Request("http://test/api/user/project", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				name: "Test Project",
				legal: [{ code: "ProjectRequirements", version: 1 }],
				understandsNotAi: true,
			}),
		});
		const { NextRequest } = await import("next/server");
		const nextReq = new NextRequest(request);

		const response = await (POST as any)(nextReq, {
			params: Promise.resolve({}),
		});

		expect(response.status).toBe(200);
		expect(prisma.project.create).toHaveBeenCalledTimes(2);
		expect((prisma.project.create as any).mock.calls[1][0].data.slug).toMatch(
			/^test-project-[0-9a-f]{6}$/,
		);
	});

	it("rejects creation when the not-AI confirmation is missing", async () => {
		const { POST } = await import("../src/app/api/user/project/route");
		const request = new Request("http://test/api/user/project", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				name: "Test Project",
				description: "Test Description",
				legal: [{ code: "ProjectRequirements", version: 1 }],
			}),
		});
		const { NextRequest } = await import("next/server");
		const nextReq = new NextRequest(request);

		const response = await (POST as any)(nextReq, {
			params: Promise.resolve({}),
		});

		expect(response.status).toBe(400);
		expect(prisma.project.create).not.toHaveBeenCalled();
	});

	it("rejects creation when the not-AI confirmation is false", async () => {
		const { POST } = await import("../src/app/api/user/project/route");
		const request = new Request("http://test/api/user/project", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				name: "Test Project",
				description: "Test Description",
				legal: [{ code: "ProjectRequirements", version: 1 }],
				understandsNotAi: false,
			}),
		});
		const { NextRequest } = await import("next/server");
		const nextReq = new NextRequest(request);

		const response = await (POST as any)(nextReq, {
			params: Promise.resolve({}),
		});

		expect(response.status).toBe(400);
		expect(prisma.project.create).not.toHaveBeenCalled();
	});

	it("asks for a speciality before the founder's team row is written", async () => {
		(prisma.user.findUnique as any).mockResolvedValue({ specialities: [] });

		const response = await postProject({});

		expect(response.status).toBe(400);
		expect(await response.json()).toMatchObject({
			error: "Add your speciality first",
		});
		expect(validate).not.toHaveBeenCalled();
		expect(prisma.project.create).not.toHaveBeenCalled();
	});

	it("answers 429 without asking the AI when the user is over the limit", async () => {
		(prisma.user.findUnique as any).mockResolvedValue({
			specialities: [{ id: "spec1" }],
		});
		limitAiCalls.mockResolvedValue(
			new Response(JSON.stringify({ error: "rateLimited", retryAfter: 30 }), {
				status: 429,
			}),
		);

		const response = await postProject({});

		expect(response.status).toBe(429);
		expect(limitAiCalls).toHaveBeenCalledWith("project-create", "user1");
		expect(validate).not.toHaveBeenCalled();
		expect(prisma.project.create).not.toHaveBeenCalled();
	});

	it("refuses a project without the Project Requirements accepted, and records nothing", async () => {
		const { POST } = await import("../src/app/api/user/project/route");
		const { NextRequest } = await import("next/server");
		const response = await (POST as any)(
			new NextRequest(
				new Request("http://test/api/user/project", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						name: "Test Project",
						understandsNotAi: true,
						legal: [],
					}),
				}),
			),
			{ params: Promise.resolve({}) },
		);

		expect(response.status).toBe(400);
		expect(await response.json()).toMatchObject({
			details: { reason: "legal.required", code: "ProjectRequirements" },
		});
		expect(prisma.project.create).not.toHaveBeenCalled();
		expect(prisma.legalAcceptance.createMany).not.toHaveBeenCalled();
	});

	it("records the acceptance against the new project", async () => {
		(prisma.user.findUnique as any).mockResolvedValue({
			id: "user1",
			specialities: [{ id: "spec1" }],
		});
		(prisma.project.findMany as any).mockResolvedValue([]);
		(prisma.project.create as any).mockResolvedValue({ id: "p1", slug: "p" });

		const { POST } = await import("../src/app/api/user/project/route");
		const { NextRequest } = await import("next/server");
		await (POST as any)(
			new NextRequest(
				new Request("http://test/api/user/project", {
					method: "POST",
					headers: {
						"content-type": "application/json",
						"x-forwarded-for": "192.0.2.7",
					},
					body: JSON.stringify({
						name: "Test Project",
						understandsNotAi: true,
						legal: [{ code: "ProjectRequirements", version: 1 }],
					}),
				}),
			),
			{ params: Promise.resolve({}) },
		);

		expect(prisma.legalAcceptance.createMany).toHaveBeenCalledWith({
			data: [
				expect.objectContaining({
					userId: "user1",
					code: "ProjectRequirements",
					context: "ProjectCreate",
					projectId: "p1",
					ipAddress: "192.0.2.7",
				}),
			],
		});
	});
});
