import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SpaceRole } from "@/config/permissions/roles";

const authMock = vi.fn();
const cabinetUpsert = vi.fn();
const cabinetUpdate = vi.fn();
const cabinetDelete = vi.fn();
const cabinetFindUnique = vi.fn();
const memberUpdateMany = vi.fn();
const joinSpace = vi.fn();

vi.mock("@/auth", () => ({ auth: () => authMock() }));

// Covered by space-guard.test.ts; mocked here so the assertions are about the
// cabinet rather than about access resolution.
vi.mock("@/lib/space-guard", () => ({
	withSpaceGuard: () => (handler: unknown) => handler,
}));

// `revokeSpaceMember` stays real: what it writes — `revokedAt`, and only on a
// row that is still live — is the behaviour these tests are about.
vi.mock("@/services/access/membership", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/services/access/membership")>()),
	joinSpace: (...args: unknown[]) => joinSpace(...args),
}));

const tx = {
	scoutCabinet: {
		upsert: (...args: unknown[]) => cabinetUpsert(...args),
		delete: (...args: unknown[]) => cabinetDelete(...args),
	},
	spaceMember: { updateMany: (...args: unknown[]) => memberUpdateMany(...args) },
};

vi.mock("@/services/prisma", () => ({
	prisma: {
		scoutCabinet: {
			upsert: (...args: unknown[]) => cabinetUpsert(...args),
			update: (...args: unknown[]) => cabinetUpdate(...args),
			delete: (...args: unknown[]) => cabinetDelete(...args),
			findUnique: (...args: unknown[]) => cabinetFindUnique(...args),
		},
		spaceMember: {
			updateMany: (...args: unknown[]) => memberUpdateMany(...args),
		},
		auditLog: { create: vi.fn() },
		$transaction: (run: (client: unknown) => unknown) => run(tx),
	},
}));

const admin = { id: "u-admin", roles: ["Admin"], onboardingDone: true };
const scout = { id: "u-scout", roles: ["Member"], onboardingDone: true };

const jsonRequest = (url: string, method: string, body?: unknown) =>
	new NextRequest(`http://localhost${url}`, {
		method,
		...(body === undefined
			? {}
			: {
					body: JSON.stringify(body),
					headers: { "content-type": "application/json" },
				}),
	});

const invoke = async (
	handler: unknown,
	request: NextRequest,
): Promise<Response> =>
	(handler as (r: NextRequest, c: unknown) => Promise<Response>)(request, {
		params: Promise.resolve({}),
	});

beforeEach(() => {
	vi.clearAllMocks();
	authMock.mockResolvedValue({ user: scout });
	cabinetUpsert.mockResolvedValue({ id: "c1" });
	cabinetUpdate.mockResolvedValue({ id: "c1" });
	cabinetDelete.mockResolvedValue({ id: "c1" });
	cabinetFindUnique.mockResolvedValue({ id: "c1" });
	memberUpdateMany.mockResolvedValue({ count: 1 });
	joinSpace.mockResolvedValue(undefined);
});

describe("createScout", () => {
	it("writes the cabinet and the membership in one transaction", async () => {
		const { createScout } = await import("@/repositories/scout");

		await createScout("u-new", { type: "Angel" });

		expect(cabinetUpsert).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { userId: "u-new" },
				create: { userId: "u-new", type: "Angel" },
				update: { type: "Angel" },
			}),
		);

		// The same client the cabinet was written with: a cabinet nobody can open
		// and a space with no settings behind it are both broken states, so the
		// two writes must roll back together.
		expect(joinSpace).toHaveBeenCalledWith(
			expect.objectContaining({ type: "scout", userId: "u-new" }),
			tx,
		);
	});

	it("makes the new scout the owner of their own cabinet", async () => {
		const { createScout } = await import("@/repositories/scout");

		await createScout("u-new", { type: "Angel" });

		expect(joinSpace.mock.calls[0][0]).toMatchObject({
			role: SpaceRole.Owner,
		});
	});

	it("records who granted it", async () => {
		const { createScout } = await import("@/repositories/scout");

		await createScout("u-new", { type: "Fund" }, "u-admin");

		expect(joinSpace.mock.calls[0][0]).toMatchObject({
			invitedById: "u-admin",
		});
	});

	it("upserts, so granting twice updates instead of failing", async () => {
		const { createScout } = await import("@/repositories/scout");

		await createScout("u-new", { type: "Publisher", isPublic: true });

		const args = cabinetUpsert.mock.calls[0][0];

		expect(args.update).toEqual({ type: "Publisher", isPublic: true });
		expect(args.create).toEqual({
			userId: "u-new",
			type: "Publisher",
			isPublic: true,
		});
	});
});

describe("POST /api/admin/scouts", () => {
	beforeEach(() => authMock.mockResolvedValue({ user: admin }));

	it("creates a scout from the admin form", async () => {
		const { POST } = await import("@/app/api/admin/scouts/route");

		const response = await invoke(
			POST,
			jsonRequest("/api/admin/scouts", "POST", {
				userId: "u-new",
				type: "Angel",
				organizationName: "  Northline  ",
			}),
		);

		expect(response.status).toBe(200);
		expect(cabinetUpsert.mock.calls[0][0].create).toMatchObject({
			userId: "u-new",
			type: "Angel",
			organizationName: "Northline",
		});
		expect(joinSpace.mock.calls[0][0]).toMatchObject({
			invitedById: "u-admin",
		});
	});

	it("refuses a scout type that is not in the enum", async () => {
		const { POST } = await import("@/app/api/admin/scouts/route");

		const response = await invoke(
			POST,
			jsonRequest("/api/admin/scouts", "POST", {
				userId: "u-new",
				type: "Benefactor",
			}),
		);

		expect(response.status).toBe(400);
		expect(cabinetUpsert).not.toHaveBeenCalled();
	});

	it("refuses a request with no user to make a scout of", async () => {
		const { POST } = await import("@/app/api/admin/scouts/route");

		const response = await invoke(
			POST,
			jsonRequest("/api/admin/scouts", "POST", { type: "Angel" }),
		);

		expect(response.status).toBe(400);
		expect(cabinetUpsert).not.toHaveBeenCalled();
	});
});

describe("PUT /api/scout/cabinet", () => {
	it("saves the fields the settings screens set", async () => {
		const { PUT } = await import("@/app/api/scout/cabinet/route");

		const response = await invoke(
			PUT,
			jsonRequest("/api/scout/cabinet", "PUT", {
				type: "Fund",
				organizationName: "Northline",
				website: "https://northline.games",
				isPublic: true,
				platforms: ["PC"],
				genres: ["Strategy"],
				stages: ["Prototype"],
				interestTypes: ["Investment"],
				alertMonthlyDigest: true,
			}),
		);

		expect(response.status).toBe(200);
		expect(cabinetUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { userId: "u-scout" },
				data: expect.objectContaining({
					type: "Fund",
					organizationName: "Northline",
					isPublic: true,
					platforms: ["PC"],
					genres: ["Strategy"],
					stages: ["Prototype"],
					interestTypes: ["Investment"],
					alertMonthlyDigest: true,
				}),
			}),
		);
	});

	it("clears a text field rather than skipping it", async () => {
		const { PUT } = await import("@/app/api/scout/cabinet/route");

		await invoke(
			PUT,
			jsonRequest("/api/scout/cabinet", "PUT", { about: null }),
		);

		expect(cabinetUpdate.mock.calls[0][0].data).toHaveProperty("about", null);
	});

	it("trims what the user typed", async () => {
		const { PUT } = await import("@/app/api/scout/cabinet/route");

		await invoke(
			PUT,
			jsonRequest("/api/scout/cabinet", "PUT", {
				organizationName: "  Northline  ",
			}),
		);

		expect(cabinetUpdate.mock.calls[0][0].data.organizationName).toBe(
			"Northline",
		);
	});

	it("saves one field without wiping the rest", async () => {
		const { PUT } = await import("@/app/api/scout/cabinet/route");

		await invoke(
			PUT,
			jsonRequest("/api/scout/cabinet", "PUT", { isPublic: true }),
		);

		// Prisma treats a missing key as "leave it alone" and `null` as "clear
		// it", so an optional field must be absent, never null.
		expect(Object.keys(cabinetUpdate.mock.calls[0][0].data)).toEqual([
			"isPublic",
			"type",
		]);
	});

	it("drops fields the settings screens have no business setting", async () => {
		const { PUT } = await import("@/app/api/scout/cabinet/route");

		await invoke(
			PUT,
			jsonRequest("/api/scout/cabinet", "PUT", {
				isPublic: true,
				userId: "u-someone-else",
			}),
		);

		expect(cabinetUpdate.mock.calls[0][0].data).not.toHaveProperty("userId");
	});

	it("refuses a scout type that is not in the enum", async () => {
		const { PUT } = await import("@/app/api/scout/cabinet/route");

		const response = await invoke(
			PUT,
			jsonRequest("/api/scout/cabinet", "PUT", { type: "Benefactor" }),
		);

		expect(response.status).toBe(400);
		expect(cabinetUpdate).not.toHaveBeenCalled();
	});
});

describe("GET /api/scout/cabinet", () => {
	it("404s when the user has no cabinet, rather than making one", async () => {
		cabinetFindUnique.mockResolvedValue(null);

		const { GET } = await import("@/app/api/scout/cabinet/route");
		const response = await invoke(
			GET,
			jsonRequest("/api/scout/cabinet", "GET"),
		);

		expect(response.status).toBe(404);
	});
});

describe("deleteScout", () => {
	it("removes the cabinet and the access it opened, together", async () => {
		const { deleteScout } = await import("@/repositories/scout");

		await deleteScout("u-scout");

		expect(cabinetDelete).toHaveBeenCalledWith({
			where: { userId: "u-scout" },
		});
		// Same client as the delete: access outliving the cabinet would leave a
		// scout inside a space with no settings behind it.
		expect(memberUpdateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					spaceType: "scout",
					userId: "u-scout",
					revokedAt: null,
				}),
			}),
		);
	});

	it("stamps the moment access ended instead of dropping the row", async () => {
		const { deleteScout } = await import("@/repositories/scout");

		await deleteScout("u-scout");

		expect(memberUpdateMany.mock.calls[0][0].data.revokedAt).toBeInstanceOf(
			Date,
		);
	});
});

describe("DELETE /api/scout/cabinet", () => {
	it("closes the cabinet of the signed-in scout, and nobody else's", async () => {
		const { DELETE } = await import("@/app/api/scout/cabinet/route");

		const response = await invoke(
			DELETE,
			jsonRequest("/api/scout/cabinet", "DELETE"),
		);

		expect(response.status).toBe(200);
		expect(cabinetDelete).toHaveBeenCalledWith({
			where: { userId: "u-scout" },
		});
	});
});
