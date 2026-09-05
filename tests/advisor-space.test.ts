import { beforeEach, describe, expect, it, vi } from "vitest";
import { isAllowedByDefault } from "@/config/permissions/defaults";
import { SpaceRole } from "@/config/permissions/roles";
import { advisorSpace } from "@/config/spaces/advisor";
import { permissionsOf } from "@/config/spaces/define-space";

const authMock = vi.fn();
const specialityCount = vi.fn();
const specialityFindMany = vi.fn();
const requestFindMany = vi.fn();
const requestFindUnique = vi.fn();
const requestCount = vi.fn();
const requestGroupBy = vi.fn();
const requestUpdate = vi.fn();
const memberFindMany = vi.fn();

vi.mock("@/auth", () => ({ auth: () => authMock() }));

vi.mock("@/services/prisma", () => ({
	prisma: {
		speciality: {
			count: (...a: unknown[]) => specialityCount(...a),
			findMany: (...a: unknown[]) => specialityFindMany(...a),
		},
		adviceRequest: {
			findMany: (...a: unknown[]) => requestFindMany(...a),
			findUnique: (...a: unknown[]) => requestFindUnique(...a),
			count: (...a: unknown[]) => requestCount(...a),
			groupBy: (...a: unknown[]) => requestGroupBy(...a),
			update: (...a: unknown[]) => requestUpdate(...a),
		},
		teamMember: { findMany: (...a: unknown[]) => memberFindMany(...a) },
	},
}));

const advisor = { id: "u-advisor", onboardingDone: true };

beforeEach(() => {
	vi.clearAllMocks();
	authMock.mockResolvedValue({ user: advisor });
	memberFindMany.mockResolvedValue([]);
	requestCount.mockResolvedValue(0);
	requestFindMany.mockResolvedValue([]);
	requestGroupBy.mockResolvedValue([]);
});

describe("advisor space definition", () => {
	it("declares the three sections the space is made of", () => {
		expect(permissionsOf(advisorSpace)).toEqual(
			expect.arrayContaining([
				"advisor.requests.view",
				"advisor.requests.manage",
				"advisor.reviews.create",
				"advisor.reviews.delete",
				"advisor.settings.manage",
			]),
		);
	});

	/**
	 * The reason the advisor holds `Owner` and not the `member` the spec names:
	 * `manage` and `delete` are not member-class actions, so a `Member` advisor
	 * could read their own inbox and change nothing in it.
	 */
	it("would leave a Member unable to work, which is why the role is Owner", () => {
		expect(isAllowedByDefault("manage", SpaceRole.Member)).toBe(false);
		expect(isAllowedByDefault("delete", SpaceRole.Member)).toBe(false);
		expect(isAllowedByDefault("manage", SpaceRole.Owner)).toBe(true);
		expect(isAllowedByDefault("delete", SpaceRole.Owner)).toBe(true);
	});
});

describe("advisor space adapter", () => {
	const resolve = async () => {
		const { advisorSpaceAdapter } = await import("@/repositories/advisor.space");
		return advisorSpaceAdapter.resolve?.("", advisor);
	};

	it("does not resolve the space for someone who offers no mentorship", async () => {
		specialityCount.mockResolvedValue(0);
		expect(await resolve()).toBeNull();
	});

	it("resolves to the single instance with the owning role", async () => {
		specialityCount.mockResolvedValue(1);
		expect(await resolve()).toEqual({
			spaceId: "default",
			role: SpaceRole.Owner,
		});
	});
});

describe("inbox filters", () => {
	it("keeps declined and withdrawn questions out of every working filter", async () => {
		const { REQUEST_FILTERS } = await import("@/repositories/advisor.requests");

		for (const filter of ["new", "inProgress", "answered"] as const) {
			expect(REQUEST_FILTERS[filter]).not.toContain("Rejected");
			expect(REQUEST_FILTERS[filter]).not.toContain("Closed");
		}
	});

	it("answers only for the status that means the advisor finished", async () => {
		const { REQUEST_FILTERS } = await import("@/repositories/advisor.requests");

		expect(REQUEST_FILTERS.answered).toEqual(["Executed"]);
		// `all` filters on nothing, which is what shows the history.
		expect(REQUEST_FILTERS.all).toBeNull();
	});

	it("counts the inbox and not the search", async () => {
		const { countAdvisorRequests } = await import(
			"@/repositories/advisor.requests"
		);

		requestGroupBy.mockResolvedValue([
			{ status: "Created", _count: { _all: 3 } },
			{ status: "Approved", _count: { _all: 2 } },
			{ status: "Rejected", _count: { _all: 4 } },
		]);

		expect(await countAdvisorRequests("u-advisor")).toEqual({
			new: 3,
			inProgress: 2,
			answered: 0,
			all: 9,
		});
	});
});

describe("listing the inbox", () => {
	const list = async (args: Parameters<
		typeof import("@/repositories/advisor.requests").listAdvisorRequests
	>[1]) => {
		const { listAdvisorRequests } = await import(
			"@/repositories/advisor.requests"
		);
		await listAdvisorRequests("u-advisor", args);
		return requestFindMany.mock.calls.at(-1)?.[0] as {
			where: Record<string, unknown>;
			skip: number;
			take: number;
		};
	};

	/**
	 * The space is single-instance and every advisor shares it, so this one line
	 * is the whole boundary between one inbox and the next.
	 */
	it("never reads a request addressed to somebody else", async () => {
		const args = await list({ filter: "all" });
		expect(args.where.toUserId).toBe("u-advisor");
	});

	it("asks the database only for the statuses the filter names", async () => {
		const args = await list({ filter: "new" });
		expect(args.where.status).toEqual({ in: ["Created"] });
	});

	it("does not constrain the status when the filter is all", async () => {
		const args = await list({ filter: "all" });
		expect(args.where.status).toBeUndefined();
	});

	it("searches the person and the project, and nothing else", async () => {
		const args = await list({ filter: "all", search: " tide " });
		const or = args.where.OR as Record<string, unknown>[];

		expect(or).toHaveLength(2);
		expect(JSON.stringify(or)).toContain("tide");
		// Trimmed: a trailing space would otherwise match nothing at all.
		expect(JSON.stringify(or)).not.toContain(" tide ");
	});

	it("pages from one, not from zero", async () => {
		expect((await list({ page: 1, limit: 10 })).skip).toBe(0);
		expect((await list({ page: 3, limit: 10 })).skip).toBe(20);
	});
});

describe("the speciality a question was asked in", () => {
	const askedIn = async () => {
		const { askedInSpeciality } = await import(
			"@/repositories/advisor.requests"
		);
		return askedInSpeciality("u-advisor");
	};

	it("names it when the advisor has opened exactly one", async () => {
		specialityFindMany.mockResolvedValue([{ name: "Publishing" }]);
		expect(await askedIn()).toBe("Publishing");
	});

	/** The request stores no speciality, so two open ones make it a guess. */
	it("says nothing rather than guessing between two", async () => {
		specialityFindMany.mockResolvedValue([
			{ name: "Publishing" },
			{ name: "Game design" },
		]);
		expect(await askedIn()).toBeNull();
	});
});

describe("marking a request done", () => {
	const complete = async () => {
		const { PUT } = await import(
			"@/app/api/user/advice-request/[id]/complete/route"
		);

		return PUT(
			new Request("http://localhost/api/user/advice-request/r-1/complete", {
				method: "PUT",
			}) as never,
			{ params: Promise.resolve({ id: "r-1" }) } as never,
			{ user: advisor } as never,
		);
	};

	it("refuses a request that was never accepted", async () => {
		requestFindUnique.mockResolvedValue({
			toUserId: "u-advisor",
			status: "Created",
		});

		expect((await complete()).status).toBe(400);
		expect(requestUpdate).not.toHaveBeenCalled();
	});

	it("refuses a request addressed to another advisor", async () => {
		requestFindUnique.mockResolvedValue({
			toUserId: "u-someone-else",
			status: "Approved",
		});

		expect((await complete()).status).toBe(404);
		expect(requestUpdate).not.toHaveBeenCalled();
	});

	it("finishes an accepted one and stamps when", async () => {
		requestFindUnique.mockResolvedValue({
			toUserId: "u-advisor",
			status: "Approved",
		});
		requestUpdate.mockResolvedValue({ id: "r-1", status: "Executed" });

		expect((await complete()).status).toBe(200);

		const data = requestUpdate.mock.calls.at(-1)?.[0].data;
		expect(data.status).toBe("Executed");
		expect(data.finishedAt).toBeInstanceOf(Date);
	});
});
