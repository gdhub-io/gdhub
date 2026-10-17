import { beforeEach, describe, expect, it, vi } from "vitest";

const specialityCount = vi.fn();
const expertFindUnique = vi.fn();
const acceptanceFindMany = vi.fn();

vi.mock("@/services/prisma", () => ({
	prisma: {
		speciality: { count: (...a: unknown[]) => specialityCount(...a) },
		expertProfile: { findUnique: (...a: unknown[]) => expertFindUnique(...a) },
		legalAcceptance: {
			findMany: (...a: unknown[]) => acceptanceFindMany(...a),
		},
	},
}));

const { needsAcceptance, pendingLegalCodes } = await import(
	"@/repositories/legal.repository"
);

beforeEach(() => {
	vi.clearAllMocks();
	specialityCount.mockResolvedValue(0);
	expertFindUnique.mockResolvedValue(null);
	acceptanceFindMany.mockResolvedValue([]);
});

describe("needsAcceptance", () => {
	const now = new Date("2026-11-01T00:00:00Z");

	it("asks someone who never accepted the document", () => {
		expect(needsAcceptance("TermsOfUse", undefined, now)).toBe(true);
	});

	it("does not ask again for the version already accepted", () => {
		expect(needsAcceptance("TermsOfUse", 1, now)).toBe(false);
	});

	it("asks nothing for a document with no version in effect", () => {
		expect(needsAcceptance("ExpertServicesTerms", undefined, now)).toBe(false);
	});
});

describe("pendingLegalCodes", () => {
	it("holds everyone to the Terms, and only advisors to the Advisor Agreement", async () => {
		expect(await pendingLegalCodes("u1")).toEqual(["TermsOfUse"]);

		specialityCount.mockResolvedValue(1);
		expect(await pendingLegalCodes("u1")).toEqual([
			"TermsOfUse",
			"AdvisorAgreement",
		]);
	});

	it("is empty once the versions in effect are accepted", async () => {
		specialityCount.mockResolvedValue(1);
		acceptanceFindMany.mockResolvedValue([
			{ code: "TermsOfUse", version: 1 },
			{ code: "AdvisorAgreement", version: 1 },
		]);
		expect(await pendingLegalCodes("u1")).toEqual([]);
	});

	it("reads only this user's acceptances", async () => {
		await pendingLegalCodes("u1");
		expect(acceptanceFindMany.mock.calls[0][0].where.userId).toBe("u1");
	});
});
