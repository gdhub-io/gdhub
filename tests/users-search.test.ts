import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const userFindMany = vi.fn();

vi.mock("@/auth", () => ({ auth: () => authMock() }));

vi.mock("@/lib/space-guard", () => ({
	withSpaceGuard: () => (handler: unknown) => handler,
}));

vi.mock("@/services/prisma", () => ({
	prisma: {
		user: { findMany: (...args: unknown[]) => userFindMany(...args) },
		auditLog: { create: vi.fn() },
	},
}));

const admin = { id: "u-admin", roles: ["Admin"], onboardingDone: true };

const call = async (query = "") => {
	const { GET } = await import("@/app/api/users/search/route");

	return (GET as never as (r: NextRequest, c: unknown) => Promise<Response>)(
		new NextRequest(`http://localhost/api/users/search${query}`),
		{ params: Promise.resolve({}) },
	);
};

const args = () => userFindMany.mock.calls[0][0];

beforeEach(() => {
	vi.clearAllMocks();
	authMock.mockResolvedValue({ user: admin });
	userFindMany.mockResolvedValue([]);
});

describe("GET /api/users/search", () => {
	it("leaves the caller out by default", async () => {
		await call("?q=marty");

		expect(args().where.id).toEqual({ not: "u-admin" });
	});

	it("includes the caller when the picker asks for it", async () => {
		// Granting yourself a role is ordinary; without this an admin cannot
		// find themselves in the scout picker at all.
		await call("?q=marty&includeSelf=true");

		expect(args().where).not.toHaveProperty("id");
	});

	it("does not read anything but 'true' as opting in", async () => {
		await call("?q=marty&includeSelf=false");

		expect(args().where.id).toEqual({ not: "u-admin" });
	});

	it("only offers people who finished onboarding and have an email", async () => {
		await call("?q=marty");

		expect(args().where).toMatchObject({
			onboardingDone: true,
			email: { not: null },
		});
	});
});
