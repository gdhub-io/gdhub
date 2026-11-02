import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * GDHUB-136: three routes acted on whatever id they were given. A priced
 * vacancy published with its fee unpaid, any devlog edited or deleted by anyone,
 * anyone's advice request withdrawn by anyone.
 */

const session = { user: { id: "me", email: "me@example.com", roles: [] } };
let access = { role: "Member", scopes: new Map<string, "own">() };
const guarded: string[] = [];

vi.mock("@/auth", () => ({ auth: vi.fn(async () => session) }));

vi.mock("@gdhub-io/gdhub-prisma", async (importOriginal) => ({
	...(await importOriginal<typeof import("@gdhub-io/gdhub-prisma")>()),
	withAuditContext: (_context: unknown, callback: () => unknown) => callback(),
}));

vi.mock("@/lib/space-guard", () => ({
	withSpaceGuard:
		({ permission }: { permission: string }) =>
		(handler: (...args: unknown[]) => unknown) =>
		(req: unknown, ctx: unknown, locals: Record<string, unknown>) => {
			guarded.push(permission);
			return handler(req, ctx, { ...locals, access });
		},
}));

vi.mock("@/services/access", () => ({
	scopeOf: (a: typeof access, permission: string) =>
		a.scopes.get(permission) ?? null,
}));

vi.mock("next/server", async (importOriginal) => ({
	...(await importOriginal<typeof import("next/server")>()),
	after: vi.fn(),
}));

vi.mock("@/services/novu", () => ({ NovuService: { send: vi.fn() } }));
vi.mock("@/services/chat/vacancy-keys", () => ({ closeVacancyChats: vi.fn() }));
vi.mock("@/services/checkpoints/flows/evidence-seen", () => ({
	seeDevlogMedia: vi.fn(),
}));

const prisma = {
	teamVacancy: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
	payment: { count: vi.fn() },
	projectReport: {
		findUnique: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
	},
	adviceRequest: { count: vi.fn(), update: vi.fn(), create: vi.fn() },
	project: { count: vi.fn() },
};
vi.mock("@/services/prisma", () => ({ prisma }));

const request = (method: string, url: string, body?: unknown) =>
	new Request(url, {
		method,
		headers: { "content-type": "application/json" },
		body: body === undefined ? undefined : JSON.stringify(body),
	}) as never;

const noParams = { params: Promise.resolve({}) } as never;
const noLocals = {} as never;

beforeEach(() => {
	vi.clearAllMocks();
	guarded.length = 0;
	access = { role: "Member", scopes: new Map() };
});

describe("a priced vacancy is published only once its fee is paid", () => {
	const draft = {
		publishedAt: null,
		createdAt: new Date(),
		status: "Draft",
		finishedAt: new Date(Date.now() + 86_400_000),
		offeredAmount: 50_000,
		team: { project: { authorId: "me" } },
	};

	it("refuses to publish while the fee is unpaid", async () => {
		const { PUT } = await import("@/app/api/user/project/vacancy/route");
		prisma.teamVacancy.findUnique.mockResolvedValue(draft);
		prisma.payment.count.mockResolvedValue(0);

		const response = await PUT(
			request("PUT", "http://x/api?id=v1", { status: "Published" }),
			noParams,
		noLocals,
		);

		expect(response.status).toBe(400);
		expect(prisma.teamVacancy.update).not.toHaveBeenCalled();
	});

	it("publishes once the fee is paid", async () => {
		const { PUT } = await import("@/app/api/user/project/vacancy/route");
		prisma.teamVacancy.findUnique.mockResolvedValue(draft);
		prisma.payment.count.mockResolvedValue(1);
		prisma.teamVacancy.update.mockResolvedValue({ id: "v1", status: "Published" });

		const response = await PUT(
			request("PUT", "http://x/api?id=v1", { status: "Published" }),
			noParams,
		noLocals,
		);

		expect(response.status).toBe(200);
	});

	it("publishes a vacancy without a price, which has no fee", async () => {
		const { PUT } = await import("@/app/api/user/project/vacancy/route");
		prisma.teamVacancy.findUnique.mockResolvedValue({
			...draft,
			offeredAmount: null,
		});
		prisma.teamVacancy.update.mockResolvedValue({ id: "v1", status: "Published" });

		const response = await PUT(
			request("PUT", "http://x/api?id=v1", { status: "Published" }),
			noParams,
		noLocals,
		);

		expect(response.status).toBe(200);
		expect(prisma.payment.count).not.toHaveBeenCalled();
	});

	it("refuses to create a priced vacancy already published, and checks the team", async () => {
		const { POST } = await import("@/app/api/user/project/vacancy/route");

		const response = await POST(
			request("POST", "http://x/api", {
				title: "Artist",
				description: "Paint",
				directionId: "d1",
				status: "Published",
				finishedAt: new Date(Date.now() + 86_400_000).toISOString(),
				teamId: "t1",
				offeredAmount: 500,
				offeredRateType: "Monthly",
			}),
			noParams,
		noLocals,
		);

		expect(response.status).toBe(400);
		expect(prisma.teamVacancy.create).not.toHaveBeenCalled();
		expect(guarded).toContain("project.vacancies.manage");
	});
});

describe("devlogs: a member edits and deletes only their own posts", () => {
	it("needs the create permission to post", async () => {
		const { POST } = await import("@/app/api/user/project/report/route");
		await Promise.resolve(
			POST(
				request("POST", "http://x/api", { content: "x", projectId: "p1" }),
				noParams,
				noLocals,
			),
		).catch(() => undefined);

		expect(guarded).toContain("project.devlog.create");
	});

	it("refuses a member deleting someone else's post", async () => {
		const { DELETE } = await import("@/app/api/user/project/report/route");
		access.scopes.set("project.devlog.manage", "own");
		prisma.projectReport.findUnique.mockResolvedValue({ authorId: "someone" });

		const response = await DELETE(
			request("DELETE", "http://x/api?id=r1"),
			noParams,
		noLocals,
		);

		expect(response.status).toBe(403);
		expect(prisma.projectReport.delete).not.toHaveBeenCalled();
	});

	it("lets a member delete their own post", async () => {
		const { DELETE } = await import("@/app/api/user/project/report/route");
		access.scopes.set("project.devlog.manage", "own");
		prisma.projectReport.findUnique.mockResolvedValue({ authorId: "me" });

		const response = await DELETE(
			request("DELETE", "http://x/api?id=r1"),
			noParams,
		noLocals,
		);

		expect(response.status).toBe(200);
	});

	it("lets the founder or an admin edit anyone's post", async () => {
		const { PUT } = await import("@/app/api/user/project/report/route");
		access = { role: "Owner", scopes: new Map() };

		const response = await PUT(
			request("PUT", "http://x/api", { id: "r1", content: "fixed" }),
			noParams,
		noLocals,
		);

		expect(response.status).toBe(200);
		expect(prisma.projectReport.findUnique).not.toHaveBeenCalled();
		expect(guarded).toContain("project.devlog.manage");
	});
});

describe("advice requests: each side acts only on its own", () => {
	it("refuses withdrawing someone else's request", async () => {
		const { PUT } = await import(
			"@/app/api/user/advice-request/[id]/cancel/route"
		);
		prisma.adviceRequest.count.mockResolvedValue(0);

		const response = await PUT(
			request("PUT", "http://x/api"),
			{ params: Promise.resolve({ id: "a1" }) } as never,
			noLocals,
		);

		expect(response.status).toBe(404);
		expect(prisma.adviceRequest.update).not.toHaveBeenCalled();
	});

	it("refuses asking for advice on someone else's project", async () => {
		const { POST } = await import("@/app/api/user/advice-request/route");
		prisma.project.count.mockResolvedValue(0);

		const response = await POST(
			request("POST", "http://x/api", {
				topic: "Pacing",
				projectId: "theirs",
				toUserId: "expert",
			}),
			noParams,
		noLocals,
		);

		expect(response.status).toBe(404);
		expect(prisma.adviceRequest.create).not.toHaveBeenCalled();
	});
});
