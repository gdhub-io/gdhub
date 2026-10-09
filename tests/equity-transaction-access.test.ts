import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const projectFindUnique = vi.fn();
const memberFindFirst = vi.fn();

vi.mock("@/auth", () => ({ auth: () => authMock() }));

vi.mock("@/services/prisma", () => ({
	prisma: {
		project: { findUnique: (...a: unknown[]) => projectFindUnique(...a) },
		teamMember: { findFirst: (...a: unknown[]) => memberFindFirst(...a) },
	},
}));

vi.mock("@/repositories/project-equity.repository", () => ({
	ProjectEquityRepository: { getTransactionHistory: vi.fn(() => []) },
}));

const get = async () => {
	const { GET } = await import("@/app/api/user/project/equity/transaction/route");
	return (GET as (r: NextRequest, c: unknown) => Promise<Response>)(
		new NextRequest(
			"http://localhost/api/user/project/equity/transaction?projectId=p1",
		),
		{ params: Promise.resolve({}) },
	);
};

beforeEach(() => {
	vi.clearAllMocks();
	authMock.mockResolvedValue({ user: { id: "u1", email: "u1@x" } });
	projectFindUnique.mockResolvedValue({ id: "p1", authorId: "author" });
});

describe("equity transactions — who may read them", () => {
	it("counts only someone on the team today, not an applicant or a departure", async () => {
		memberFindFirst.mockResolvedValue(null);

		const response = await get();

		expect(memberFindFirst.mock.calls[0][0].where).toMatchObject({
			userId: "u1",
			status: { in: ["Hired", "Founder"] },
			finishedAt: null,
		});
		expect(response.status).toBe(403);
	});

	it("lets a current member read them", async () => {
		memberFindFirst.mockResolvedValue({ id: "m1" });

		expect((await get()).status).toBe(200);
	});
});
