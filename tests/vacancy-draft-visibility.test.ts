import { TeamVacancyStatus } from "@gdhub-io/gdhub-prisma";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const vacancyFindUnique = vi.fn();
const vacancyFindFirst = vi.fn();
const specialityCount = vi.fn();
const applicationCreate = vi.fn();

vi.mock("@/auth", () => ({ auth: () => authMock() }));
vi.mock("@/repositories/project/team", () => ({
	currentMembership: vi.fn(async () => null),
}));
vi.mock("@/services/novu", () => ({ NovuService: { send: vi.fn() } }));
vi.mock("@/services/prisma", () => ({
	prisma: {
		teamVacancy: {
			findUnique: (...a: unknown[]) => vacancyFindUnique(...a),
			findFirst: (...a: unknown[]) => vacancyFindFirst(...a),
		},
		speciality: { count: (...a: unknown[]) => specialityCount(...a) },
		vacancyApplication: {
			findFirst: vi.fn(async () => null),
			create: (...a: unknown[]) => applicationCreate(...a),
		},
		profile: { update: vi.fn() },
	},
}));

const { POST } = await import("@/app/api/user/project/vacancy/apply/route");
const { findPublicVacancy } = await import("@/repositories/vacancy/vacancy");

const apply = () =>
	POST(
		new NextRequest("http://localhost/api/user/project/vacancy/apply", {
			method: "POST",
			body: JSON.stringify({ vacancyId: "v1", specialityId: "s1" }),
		}),
		{ params: Promise.resolve({}) },
		{},
	);

const vacancy = (status: TeamVacancyStatus) => ({
	id: "v1",
	teamId: "t1",
	status,
	team: { project: { author: { id: "a1" }, equity: null, workflow: null } },
});

beforeEach(() => {
	vi.clearAllMocks();
	authMock.mockResolvedValue({ user: { id: "u1", email: "u1@x.io" } });
	specialityCount.mockResolvedValue(1);
});

// A draft, paid or not, is not on the board: nobody applies to it.
describe("applying to a position", () => {
	it("refuses a draft", async () => {
		vacancyFindUnique.mockResolvedValue(vacancy(TeamVacancyStatus.Draft));

		expect((await apply()).status).toBe(400);
		expect(applicationCreate).not.toHaveBeenCalled();
	});

	it("refuses someone else's speciality", async () => {
		vacancyFindUnique.mockResolvedValue(vacancy(TeamVacancyStatus.Published));
		specialityCount.mockResolvedValue(0);

		expect((await apply()).status).toBe(403);
		expect(specialityCount).toHaveBeenCalledWith({
			where: { id: "s1", userId: "u1" },
		});
		expect(applicationCreate).not.toHaveBeenCalled();
	});
});

describe("the public vacancy", () => {
	it("never reads a draft", async () => {
		vacancyFindFirst.mockResolvedValue(null);

		await findPublicVacancy("v1");

		expect(vacancyFindFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "v1", status: { not: TeamVacancyStatus.Draft } },
			}),
		);
	});
});
