import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const permissions: string[] = [];
const regenerateEntry = vi.fn();
const rebuildStep = vi.fn();
const replaceDraft = vi.fn();

vi.mock("@/auth", () => ({ auth: () => authMock() }));

// The guard itself is covered by space-guard.test.ts: here it lets admins
// through and answers 403 to anyone else, and records what each route asks for.
vi.mock("@/lib/space-guard", () => ({
	withSpaceGuard:
		({ permission }: { permission: string }) =>
		(handler: (...a: unknown[]) => unknown) => {
			permissions.push(permission);
			return (
				req: unknown,
				ctx: unknown,
				locals: { user?: { roles: string[] } },
			) =>
				locals.user?.roles.includes("Admin")
					? handler(req, ctx, locals)
					: NextResponse.json({ error: "Forbidden" }, { status: 403 });
		},
}));

vi.mock("@/services/checkpoints/flows/regenerate", () => ({
	regenerateEntry: (...a: unknown[]) => regenerateEntry(...a),
	rebuildStep: (...a: unknown[]) => rebuildStep(...a),
	replaceDraft: (...a: unknown[]) => replaceDraft(...a),
}));

const KEY = "11111111-1111-4111-8111-111111111111";
const BASE = "http://localhost/api/admin/checkpoints/cp1/journal";

const routes = {
	regenerate: {
		load: () => import("@/app/api/admin/checkpoints/[id]/journal/[entryId]/regenerate/route"),
		params: { id: "cp1", entryId: "j1" },
		body: { hint: "Read it all" },
	},
	replace: {
		load: () => import("@/app/api/admin/checkpoints/[id]/journal/[entryId]/replace/route"),
		params: { id: "cp1", entryId: "j1" },
		body: { draftKey: KEY },
	},
	rebuild: {
		load: () => import("@/app/api/admin/checkpoints/[id]/journal/steps/[sprint]/rebuild/route"),
		params: { id: "cp1", sprint: "2" },
		body: {},
	},
	replaceStep: {
		load: () => import("@/app/api/admin/checkpoints/[id]/journal/steps/[sprint]/replace/route"),
		params: { id: "cp1", sprint: "2" },
		body: { draftKey: KEY },
	},
};

const call = async (name: keyof typeof routes, body?: unknown) => {
	const route = routes[name];
	const { POST } = await route.load();
	return (POST as (r: NextRequest, c: unknown) => Promise<Response>)(
		new NextRequest(BASE, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(body ?? route.body),
		}),
		{ params: Promise.resolve(route.params) },
	);
};

const as = (roles: string[]) =>
	authMock.mockResolvedValue({
		user: { id: "u1", roles, onboardingDone: true },
	});

beforeEach(() => {
	vi.clearAllMocks();
	const change = { entryId: "j1", current: { id: "j1" }, draft: { id: "j1" } };
	regenerateEntry.mockResolvedValue({ ok: true, draftKey: KEY, changes: [change] });
	rebuildStep.mockResolvedValue({ ok: true, draftKey: KEY, changes: [change] });
	replaceDraft.mockResolvedValue({ ok: true });
});

describe("the regenerate routes", () => {
	it("ask for admin.checkpoints.manage, every one of them", async () => {
		for (const name of Object.keys(routes) as (keyof typeof routes)[]) {
			await routes[name].load();
		}
		expect(permissions).toHaveLength(4);
		expect(new Set(permissions)).toEqual(new Set(["admin.checkpoints.manage"]));
	});

	it("answer 403 to a member, and never reach the AI or the journal", async () => {
		as(["Member"]);
		for (const name of Object.keys(routes) as (keyof typeof routes)[]) {
			expect((await call(name)).status).toBe(403);
		}
		expect(regenerateEntry).not.toHaveBeenCalled();
		expect(rebuildStep).not.toHaveBeenCalled();
		expect(replaceDraft).not.toHaveBeenCalled();
	});

	it("hand the admin's id and hint to the draft, and the key alone to Replace", async () => {
		as(["Admin"]);
		const response = await call("regenerate");
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			draftKey: KEY,
			changes: [{ entryId: "j1", current: { id: "j1" }, draft: { id: "j1" } }],
		});
		expect(regenerateEntry).toHaveBeenCalledWith("cp1", "j1", "u1", "Read it all");

		expect((await call("rebuild")).status).toBe(200);
		expect(rebuildStep).toHaveBeenCalledWith("cp1", 2, "u1", null);

		expect((await call("replace")).status).toBe(200);
		expect(replaceDraft).toHaveBeenCalledWith("cp1", "u1", KEY, { entryId: "j1" });
		expect((await call("replaceStep")).status).toBe(200);
		expect(replaceDraft).toHaveBeenLastCalledWith("cp1", "u1", KEY, { step: 2 });
	});

	it("refuse a malformed key and a closed step", async () => {
		as(["Admin"]);
		expect((await call("replace", { draftKey: "guess" })).status).toBe(400);
		replaceDraft.mockResolvedValue({ ok: false, error: "closed" });
		expect((await call("replace")).status).toBe(409);
		replaceDraft.mockResolvedValue({ ok: false, error: "gone" });
		expect((await call("replace")).status).toBe(404);
		regenerateEntry.mockResolvedValue({ ok: false, error: "closed" });
		expect((await call("regenerate")).status).toBe(409);
	});
});
