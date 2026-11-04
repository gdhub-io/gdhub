import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const updateMany = vi.fn();
const count = vi.fn();
const findMany = vi.fn();

vi.mock("@/auth", () => ({ auth: () => authMock() }));
// The guard itself is covered by space-guard.test.ts.
vi.mock("@/lib/space-guard", () => ({
	withSpaceGuard: () => (handler: unknown) => handler,
}));
vi.mock("@/services/prisma", () => ({
	prisma: {
		speciality: {
			updateMany: (...a: unknown[]) => updateMany(...a),
			count: (...a: unknown[]) => count(...a),
			findMany: (...a: unknown[]) => findMany(...a),
		},
	},
}));

const { PATCH } = await import(
	"@/app/api/admin/user/[id]/featured-expert/route"
);
const { isLandingExpert, landingExpertWhere } = await import(
	"@/repositories/content/landing"
);

const patch = (isFeatured: boolean) =>
	PATCH(
		new NextRequest("http://localhost/api/admin/user/u1/featured-expert", {
			method: "PATCH",
			body: JSON.stringify({ isFeatured }),
		}),
		{ params: Promise.resolve({ id: "u1" }) },
		{},
	);

beforeEach(() => {
	vi.clearAllMocks();
	authMock.mockResolvedValue({ user: { id: "admin" } });
});

describe("featuring an expert", () => {
	// Only this person's expert specialities move, never anyone else's.
	it("flags this person's expert specialities", async () => {
		updateMany.mockResolvedValue({ count: 1 });

		expect((await patch(true)).status).toBe(200);
		expect(updateMany).toHaveBeenCalledWith({
			where: { userId: "u1", ...landingExpertWhere },
			data: { isFeatured: true },
		});
	});

	it("refuses someone who is not an expert open to mentoring", async () => {
		updateMany.mockResolvedValue({ count: 0 });

		expect((await patch(true)).status).toBe(400);
	});
});

describe("who counts as a landing expert", () => {
	const expert = {
		level: "Expert" as const,
		isOpenForMentoring: true,
		openForQuestions: ["code review"],
	};

	it("is an expert level, open to mentoring, taking questions", () => {
		expect(isLandingExpert(expert)).toBe(true);
		expect(isLandingExpert({ ...expert, isOpenForMentoring: false })).toBe(
			false,
		);
		expect(isLandingExpert({ ...expert, openForQuestions: [] })).toBe(false);
		expect(isLandingExpert({ ...expert, level: "Beginner" as never })).toBe(
			false,
		);
	});
});
