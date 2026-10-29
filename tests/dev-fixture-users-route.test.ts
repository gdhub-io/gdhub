import { beforeEach, describe, expect, it, vi } from "vitest";

let e2eAuth = false;

vi.mock("../src/auth", () => ({
	get isE2EAuth() {
		return e2eAuth;
	},
	auth: vi.fn(),
}));

vi.mock("../src/repositories/admin/dev-fixture-users", () => ({
	listFixtureUsers: vi.fn(),
}));

vi.mock("../src/services/prisma", () => ({ prisma: {} }));

import { GET } from "../src/app/api/dev/fixture-users/route";
import { listFixtureUsers } from "../src/repositories/admin/dev-fixture-users";

const fixtures = [
	{ email: "scout@gdhub.local", name: "Scout", image: null, badges: [] },
];

describe("GET /api/dev/fixture-users", () => {
	beforeEach(() => {
		vi.mocked(listFixtureUsers).mockResolvedValue(fixtures);
	});

	it("hides the accounts where nothing can sign in as them", async () => {
		e2eAuth = false;

		const response = await GET();

		expect(response.status).toBe(404);
		expect(listFixtureUsers).not.toHaveBeenCalled();
	});

	it("lists them where the credentials provider exists", async () => {
		e2eAuth = true;

		const response = await GET();

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual(fixtures);
	});
});
