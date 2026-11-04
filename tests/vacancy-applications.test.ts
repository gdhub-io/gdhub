import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SpaceRole } from "@/config/permissions/roles";
import { listingStateOf, positionStateOf } from "@/lib/vacancy/listing-state";
import { seenByTheProject } from "@/lib/vacancy/seen";

/**
 * GDHUB-127: an application is its own row and never a team member. What can go
 * wrong silently is who may withdraw what, a second open application, a hire that
 * does not link back, and a "viewed" stamped by somebody outside the project.
 */

const authMock = vi.fn();
const application = {
	findFirst: vi.fn(),
	findUniqueOrThrow: vi.fn(),
	create: vi.fn(),
	updateMany: vi.fn(),
};
const teamMember = { findFirst: vi.fn() };

vi.mock("@/auth", () => ({ auth: () => authMock() }));
vi.mock("@/services/novu", () => ({ NovuService: { send: vi.fn() } }));
vi.mock("@/services/chat/vacancy-keys", () => ({ closeVacancyChats: vi.fn() }));
vi.mock("@/services/prisma", () => ({
	prisma: {
		vacancyApplication: application,
		teamMember,
		teamVacancy: {
			findUnique: vi.fn().mockResolvedValue({
				id: "vac1",
				teamId: "team1",
				title: "Level designer",
				team: { project: { authorId: "author", author: { email: "a@x" }, slug: "p" } },
			}),
		},
		profile: { update: vi.fn() },
		auditLog: { create: vi.fn() },
	},
}));

const candidate = { id: "u-cand", roles: ["Member"], onboardingDone: true };

const call = async (path: string, method: "POST" | "PUT", body: unknown) => {
	const route = await import(`@/app/api/user/project/vacancy/${path}/route`);
	return (route[method] as (r: NextRequest, c: unknown) => Promise<Response>)(
		new NextRequest(`http://localhost/api/${path}`, {
			method,
			body: JSON.stringify(body),
			headers: { "content-type": "application/json" },
		}),
		{ params: Promise.resolve({}) },
	);
};

beforeEach(() => {
	vi.clearAllMocks();
	authMock.mockResolvedValue({ user: candidate });
});

describe("withdrawing an application", () => {
	it("touches only the candidate's own open application", async () => {
		application.updateMany.mockResolvedValue({ count: 1 });
		application.findUniqueOrThrow.mockResolvedValue({
			user: { id: candidate.id, name: "Ana", profile: null },
			vacancy: { id: "vac1", title: "Level designer", team: { members: [] } },
		});

		const response = await call("withdraw", "PUT", { id: "app1" });

		expect(response.status).toBe(200);
		expect(application.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "app1", userId: candidate.id, status: "Submitted" },
				data: expect.objectContaining({ status: "Withdrawn" }),
			}),
		);
	});

	it("finds nothing for someone else's application, or one already decided", async () => {
		application.updateMany.mockResolvedValue({ count: 0 });

		const response = await call("withdraw", "PUT", { id: "app-of-another" });

		expect(response.status).toBe(404);
		expect(application.findUniqueOrThrow).not.toHaveBeenCalled();
	});
});

describe("applying", () => {
	const apply = () =>
		call("apply", "POST", { specialityId: "sp1", vacancyId: "vac1" });

	it("refuses a second open application to the same position", async () => {
		teamMember.findFirst.mockResolvedValue(null);
		application.findFirst.mockResolvedValue({ id: "app1" });

		const response = await apply();

		expect(response.status).toBe(400);
		expect(application.create).not.toHaveBeenCalled();
	});

	it("refuses someone already on the team", async () => {
		teamMember.findFirst.mockResolvedValue({ id: "tm1" });

		const response = await apply();

		expect(response.status).toBe(400);
		expect(application.create).not.toHaveBeenCalled();
	});

	it("writes an application, never a team member", async () => {
		teamMember.findFirst.mockResolvedValue(null);
		application.findFirst.mockResolvedValue(null);
		application.create.mockResolvedValue({
			id: "app2",
			user: { name: "Ana", profile: null },
		});

		const response = await apply();

		expect(response.status).toBe(200);
		expect(application.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					userId: candidate.id,
					vacancyId: "vac1",
					specialityId: "sp1",
				}),
			}),
		);
	});
});

describe("who stamps an application as viewed", () => {
	it.each([
		[SpaceRole.Owner, false, true],
		[SpaceRole.Admin, false, true],
		[SpaceRole.Member, false, false],
		// A platform super admin opening the card is not the project seeing it.
		[SpaceRole.Owner, true, false],
	])("role %s, via super admin %s → %s", (role, viaSuperAdmin, seen) => {
		expect(seenByTheProject({ role, viaSuperAdmin })).toBe(seen);
	});
});

describe("the listing payment the admin reads", () => {
	it.each([
		[null, "free"],
		["COMPLETED", "paid"],
		["PROCESSING", "pending"],
		["FAILED", "failed"],
		["CANCELED", "cancelled"],
		["PARTIALLY_REFUNDED", "refunded"],
		["DISPUTED", "disputed"],
	] as const)("%s → %s", (status, state) => {
		expect(listingStateOf(status)).toBe(state);
	});

	it("reads a published position past its date as expired", () => {
		const now = new Date("2026-11-04");
		expect(
			positionStateOf(
				{ status: "Published", finishedAt: new Date("2026-11-01") },
				now,
			),
		).toBe("expired");
		expect(
			positionStateOf(
				{ status: "Published", finishedAt: new Date("2026-11-30") },
				now,
			),
		).toBe("published");
	});
});
