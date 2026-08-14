import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();

vi.mock("@/auth", () => ({ auth: () => authMock() }));

vi.mock("@gdhub-io/gdhub-prisma", async (importOriginal) => ({
	...(await importOriginal<Record<string, unknown>>()),
	withAuditContext: (context: unknown, callback: () => unknown) => {
		auditContexts.push(context);
		return callback();
	},
}));

vi.mock("@/services/prisma", () => ({ prisma: {} }));

const auditContexts: unknown[] = [];

import { json, withAuth } from "@/lib/api-handlers";

const handler = vi.fn(async () => json({ ok: true }));

const request = (headers?: Record<string, string>) =>
	new NextRequest("http://localhost/api/user/project", {
		method: "POST",
		headers,
	});

beforeEach(() => {
	auditContexts.length = 0;
	authMock.mockReset();
	handler.mockClear();
});

// Set at the outermost wrapper so it covers every route, not just the ones
// behind `withSpaceGuard` — without that, most extension-written rows carried no actor.
describe("withAuth — audit context", () => {
	it("attributes every write to the signed-in caller", async () => {
		authMock.mockResolvedValue({ user: { id: "u1" } });

		const guarded = withAuth({ mode: "user" })(handler);
		await guarded(request(), { params: Promise.resolve({}) }, {});

		expect(auditContexts).toEqual([
			{ actorUserId: "u1", source: "api", requestId: undefined },
		]);
	});

	it("carries the request id when the caller sent one", async () => {
		authMock.mockResolvedValue({ user: { id: "u1" } });

		const guarded = withAuth({ mode: "user" })(handler);
		await guarded(
			request({ "x-request-id": "req-42" }),
			{ params: Promise.resolve({}) },
			{},
		);

		expect(auditContexts[0]).toMatchObject({ requestId: "req-42" });
	});

	it("still opens a context for an anonymous caller, so the source is known", async () => {
		authMock.mockResolvedValue(null);

		const guarded = withAuth({ mode: "any" })(handler);
		await guarded(request(), { params: Promise.resolve({}) }, {});

		expect(auditContexts).toEqual([
			{ actorUserId: null, source: "api", requestId: undefined },
		]);
	});

	it("opens no context when the request is rejected", async () => {
		authMock.mockResolvedValue(null);

		const guarded = withAuth({ mode: "user" })(handler);
		const response = await guarded(
			request(),
			{ params: Promise.resolve({}) },
			{},
		);

		expect(response.status).toBe(401);
		expect(auditContexts).toEqual([]);
		expect(handler).not.toHaveBeenCalled();
	});
});
