import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SpaceRole } from "@/config/permissions/roles";
import type { SpaceAccess } from "@/services/access/types";

process.env.RBAC_ENFORCE = "true";

const authMock = vi.fn();
const getSpaceAccess = vi.fn();
const deleteFreeCheckpoint = vi.fn();

vi.mock("@/auth", () => ({ auth: () => authMock() }));
vi.mock("@/services/access", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/services/access")>()),
	getSpaceAccess: (...a: unknown[]) => getSpaceAccess(...a),
}));
vi.mock("@/services/access/audit", () => ({
	logAccessDenied: vi.fn(),
	logSuperAdminOverride: vi.fn(),
}));
vi.mock("@/services/access/matrix-source", () => ({
	getMatrixHealth: () => ({ source: "stored", loadedAt: 0, lastError: null }),
}));
vi.mock("@/services/checkpoints/flows/admin", () => ({
	deleteFreeCheckpoint: (...a: unknown[]) => deleteFreeCheckpoint(...a),
}));

const { DELETE } = await import("@/app/api/admin/checkpoints/[id]/route");

const remove = () =>
	(DELETE as (r: NextRequest, c: unknown) => Promise<Response>)(
		new NextRequest("http://localhost/api/admin/checkpoints/cp1", {
			method: "DELETE",
		}),
		{ params: Promise.resolve({ id: "cp1" }) },
	);

const access = (
	role: SpaceAccess["role"],
	permissions: string[] = [],
): SpaceAccess => ({
	type: "admin",
	id: "default",
	role,
	permissions: new Set(permissions),
	scopes: new Map(),
	viaSuperAdmin: false,
});

const signedIn = (id: string) =>
	authMock.mockResolvedValue({
		user: { id, roles: [], onboardingDone: true },
	});

beforeEach(() => {
	vi.clearAllMocks();
	deleteFreeCheckpoint.mockResolvedValue({ ok: true });
});

describe("deleting a checkpoint from the admin API", () => {
	it("refuses a visitor who is not signed in", async () => {
		authMock.mockResolvedValue(null);

		expect((await remove()).status).toBe(401);
		expect(deleteFreeCheckpoint).not.toHaveBeenCalled();
	});

	it("does not even show the admin space to an ordinary user", async () => {
		signedIn("author");
		getSpaceAccess.mockResolvedValue(access("none"));

		expect((await remove()).status).toBe(404);
		expect(deleteFreeCheckpoint).not.toHaveBeenCalled();
	});

	it("refuses an admin who may manage checkpoints but not delete them", async () => {
		signedIn("hub-admin");
		getSpaceAccess.mockResolvedValue(
			access(SpaceRole.Admin, [
				"admin.checkpoints.view",
				"admin.checkpoints.manage",
			]),
		);

		expect((await remove()).status).toBe(403);
		expect(deleteFreeCheckpoint).not.toHaveBeenCalled();
	});

	it("lets the holder of the permission delete, as themselves", async () => {
		signedIn("owner");
		getSpaceAccess.mockResolvedValue(
			access(SpaceRole.Owner, ["admin.checkpoints.delete"]),
		);

		expect((await remove()).status).toBe(200);
		expect(deleteFreeCheckpoint).toHaveBeenCalledWith("cp1", "owner");
	});
});
