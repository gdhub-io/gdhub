import { TeamMemberStatus, UserRole } from "@gdhub-io/gdhub-prisma";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const projectFindFirst = vi.fn();
const projectFindUnique = vi.fn();

vi.mock("@/auth", () => ({ auth: () => authMock() }));

const auditCreate = vi.fn();

vi.mock("@/services/prisma", () => ({
	prisma: {
		project: {
			findFirst: (...args: unknown[]) => projectFindFirst(...args),
			findUnique: (...args: unknown[]) => projectFindUnique(...args),
		},
		auditLog: { create: (...args: unknown[]) => auditCreate(...args) },
		// No membership rows in these fixtures: roles come from the project table
		// through the adapter.
		spaceMember: { findUnique: async () => null },
	},
}));

import { ProjectStatus } from "@gdhub-io/gdhub-prisma";
import { json } from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import {
	codeSource,
	setMatrixSource,
} from "@/services/access/matrix-source";

const owner = {
	id: "u-owner",
	roles: [UserRole.Member],
	onboardingDone: true,
};
const outsider = {
	id: "u-outsider",
	roles: [UserRole.Member],
	onboardingDone: true,
};

/** Records that the guarded handler ran, and with which access. */
const handler = vi.fn(async (_req, _ctx, locals: { access?: unknown }) =>
	json({ ok: true, role: (locals.access as { role: string })?.role }),
);

const request = (url = "http://localhost/api/user/project?id=p1") =>
	new NextRequest(url, { method: "PUT" });

const bodyRequest = (body: unknown) =>
	new NextRequest("http://localhost/api/user/project/team", {
		method: "POST",
		body: JSON.stringify(body),
		headers: { "content-type": "application/json" },
	});

beforeEach(() => {
	setMatrixSource(codeSource);
	auditCreate.mockReset();
	auditCreate.mockResolvedValue({ id: "audit-1" });
	authMock.mockReset();
	projectFindFirst.mockReset();
	projectFindUnique.mockReset();
	handler.mockClear();

	authMock.mockResolvedValue({ user: owner });
	projectFindUnique.mockResolvedValue({ status: ProjectStatus.Approved });
	projectFindFirst.mockResolvedValue({
		id: "p1",
		authorId: owner.id,
		team: { members: [] },
	});
});

describe("withSpaceGuard", () => {
	it("lets the owner through and injects the resolved access", async () => {
		const guarded = withSpaceGuard({
			permission: "project.info.edit",
			idFrom: "query.id",
		})(handler);

		const response = await guarded(request(), { params: Promise.resolve({}) }, {});

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({
			ok: true,
			role: "Owner",
		});
	});

	it("answers 404 for someone with no role — the space must not be visible", async () => {
		authMock.mockResolvedValue({ user: outsider });

		const guarded = withSpaceGuard({
			permission: "project.info.edit",
			idFrom: "query.id",
		})(handler);

		const response = await guarded(request(), { params: Promise.resolve({}) }, {});

		expect(response.status).toBe(404);
		expect(handler).not.toHaveBeenCalled();
	});

	it("answers 403 when the role exists but the permission does not", async () => {
		projectFindFirst.mockResolvedValue({
			id: "p1",
			authorId: "someone-else",
			team: { members: [{ status: TeamMemberStatus.Hired }] },
		});

		const guarded = withSpaceGuard({
			permission: "project.info.edit",
			idFrom: "query.id",
		})(handler);

		const response = await guarded(request(), { params: Promise.resolve({}) }, {});

		expect(response.status).toBe(403);
		expect(handler).not.toHaveBeenCalled();
	});

	it("answers 401 without a session", async () => {
		authMock.mockResolvedValue(null);

		const guarded = withSpaceGuard({
			permission: "project.info.edit",
			idFrom: "query.id",
		})(handler);

		const response = await guarded(request(), { params: Promise.resolve({}) }, {});

		expect(response.status).toBe(401);
	});

	it("answers 503 while the permission matrix is unreadable", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		setMatrixSource(() => {
			throw new Error("connection refused");
		});

		const guarded = withSpaceGuard({
			permission: "project.info.edit",
			idFrom: "query.id",
		})(handler);

		const response = await guarded(request(), { params: Promise.resolve({}) }, {});

		// Not 403: the caller may well be allowed, we simply cannot tell.
		expect(response.status).toBe(503);
		expect(handler).not.toHaveBeenCalled();
	});

	it("reads the id from the body", async () => {
		const guarded = withSpaceGuard({
			permission: "project.info.edit",
			idFrom: "body.projectId",
		})(handler);

		const response = await guarded(
			bodyRequest({ projectId: "p1" }),
			{ params: Promise.resolve({}) },
			{},
		);

		expect(response.status).toBe(200);
		expect(projectFindFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { OR: [{ slug: "p1" }, { id: "p1" }] },
			}),
		);
	});

	it("reads the id from the route params", async () => {
		const guarded = withSpaceGuard({
			permission: "project.info.edit",
			idFrom: "params.slug",
		})(handler);

		const response = await guarded(
			request("http://localhost/api/x"),
			{ params: Promise.resolve({ slug: "my-project" }) },
			{},
		);

		expect(response.status).toBe(200);
		expect(projectFindFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { OR: [{ slug: "my-project" }, { id: "my-project" }] },
			}),
		);
	});

	it("asks for the id when it is missing", async () => {
		const guarded = withSpaceGuard({
			permission: "project.info.edit",
			idFrom: "query.id",
		})(handler);

		const response = await guarded(
			request("http://localhost/api/user/project"),
			{ params: Promise.resolve({}) },
			{},
		);

		expect(response.status).toBe(400);
	});

	it("answers 404 when a nested resolver finds no owning space", async () => {
		const guarded = withSpaceGuard({
			permission: "project.vacancies.review",
			idFrom: async () => null,
		})(handler);

		const response = await guarded(
			bodyRequest({ id: "gone" }),
			{ params: Promise.resolve({}) },
			{},
		);

		// A body id pointing at a deleted member is indistinguishable from one
		// pointing at somebody else's — both must look the same from outside.
		expect(response.status).toBe(404);
	});

	it("refuses to write to an archived project", async () => {
		projectFindUnique.mockResolvedValue({ status: ProjectStatus.Archived });

		const guarded = withSpaceGuard({
			permission: "project.info.edit",
			idFrom: "query.id",
		})(handler);

		const response = await guarded(request(), { params: Promise.resolve({}) }, {});

		expect(response.status).toBe(403);
	});

	it("lets a super-admin through regardless", async () => {
		authMock.mockResolvedValue({
			user: { ...outsider, isSuperAdmin: true },
		});

		const guarded = withSpaceGuard({
			permission: "project.lifecycle.delete",
			idFrom: "query.id",
		})(handler);

		const response = await guarded(request(), { params: Promise.resolve({}) }, {});

		expect(response.status).toBe(200);
	});
});

describe("audit trail", () => {
	it("logs a denial with the permission, space and role", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		projectFindFirst.mockResolvedValue({
			id: "p1",
			authorId: "someone-else",
			team: { members: [{ status: TeamMemberStatus.Hired }] },
		});

		// Each audit test uses its own permission: the throttle below is module
		// state and would otherwise swallow the row.
		const guarded = withSpaceGuard({
			permission: "project.members.invite",
			idFrom: "query.id",
		})(handler);

		await guarded(request(), { params: Promise.resolve({}) }, {});

		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining('"permission":"project.members.invite"'),
		);
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('"role":"Member"'));
		expect(auditCreate).toHaveBeenCalledWith({
			data: expect.objectContaining({
				actorUserId: owner.id,
				entity: "space_access",
				entityId: "project:p1",
				action: "ACCESS_DENIED",
				meta: expect.objectContaining({ permission: "project.members.invite" }),
			}),
		});

		warn.mockRestore();
	});

	it("records the same denial once a minute, but logs it every time", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		projectFindFirst.mockResolvedValue({
			id: "p1",
			authorId: "someone-else",
			team: { members: [{ status: TeamMemberStatus.Hired }] },
		});

		const guarded = withSpaceGuard({
			permission: "project.artifacts.manage",
			idFrom: "query.id",
		})(handler);

		await guarded(request(), { params: Promise.resolve({}) }, {});
		await guarded(request(), { params: Promise.resolve({}) }, {});

		// A refused request is cheap to repeat; the table must not fill up with
		// identical rows.
		expect(auditCreate).toHaveBeenCalledTimes(1);
		expect(warn).toHaveBeenCalledTimes(2);

		warn.mockRestore();
	});

	it("shouts about a super-admin override", async () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		authMock.mockResolvedValue({
			user: { ...outsider, isSuperAdmin: true },
		});

		const guarded = withSpaceGuard({
			permission: "project.lifecycle.delete",
			idFrom: "query.id",
		})(handler);

		await guarded(request(), { params: Promise.resolve({}) }, {});

		expect(error).toHaveBeenCalledWith(
			expect.stringContaining("superadmin_override"),
		);
		expect(auditCreate).toHaveBeenCalledWith({
			data: expect.objectContaining({ action: "ACCESS_OVERRIDE" }),
		});

		error.mockRestore();
	});

	it("never fails a request because auditing failed", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		auditCreate.mockRejectedValue(new Error("audit table is gone"));
		projectFindFirst.mockResolvedValue({
			id: "p1",
			authorId: "someone-else",
			team: { members: [{ status: TeamMemberStatus.Hired }] },
		});

		const guarded = withSpaceGuard({
			permission: "project.workflow.edit",
			idFrom: "query.id",
		})(handler);

		const response = await guarded(request(), { params: Promise.resolve({}) }, {});

		expect(response.status).toBe(403);

		warn.mockRestore();
		error.mockRestore();
	});

});

describe("withSpaceGuard — super-admin override logging", () => {
	const superAdmin = { ...owner, id: "u-super", isSuperAdmin: true };

	/** Audit rows the guard wrote for a break-glass use. */
	const overrides = () =>
		auditCreate.mock.calls.filter(
			(call) =>
				(call[0] as { data?: { action?: string } })?.data?.action ===
				"ACCESS_OVERRIDE",
		);

	beforeEach(() => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		authMock.mockResolvedValue({ user: superAdmin });
	});

	it("stays silent on a read", async () => {
		// A super-admin trips the bypass on every guarded GET. Logging those is how
		// ACCESS_OVERRIDE grew to 64% of the table without recording anything.
		projectFindFirst.mockResolvedValue({
			id: "p1",
			authorId: "someone-else",
			team: { members: [] },
		});

		const guarded = withSpaceGuard({
			permission: "project.info.view",
			idFrom: "query.id",
		})(handler);

		const response = await guarded(
			new NextRequest("http://localhost/api/user/project?id=p1"),
			{ params: Promise.resolve({}) },
			{},
		);

		expect(response.status).toBe(200);
		expect(overrides()).toHaveLength(0);
	});

	it("stays silent when the caller had the permission anyway", async () => {
		// Owner of the project *and* a super-admin: nothing was bypassed, so there
		// is no break-glass to record.
		projectFindFirst.mockResolvedValue({
			id: "p1",
			authorId: superAdmin.id,
			team: { members: [] },
		});

		const guarded = withSpaceGuard({
			permission: "project.info.edit",
			idFrom: "query.id",
		})(handler);

		await guarded(request(), { params: Promise.resolve({}) }, {});

		expect(overrides()).toHaveLength(0);
	});

	it("records a write the flag alone let through", async () => {
		projectFindFirst.mockResolvedValue({
			id: "p1",
			authorId: "someone-else",
			team: { members: [] },
		});

		const guarded = withSpaceGuard({
			permission: "project.info.edit",
			idFrom: "query.id",
		})(handler);

		const response = await guarded(request(), { params: Promise.resolve({}) }, {});

		expect(response.status).toBe(200);
		expect(overrides()).toHaveLength(1);
		expect(overrides()[0][0]).toMatchObject({
			data: { actorUserId: superAdmin.id, entity: "space_access" },
		});
	});
});
