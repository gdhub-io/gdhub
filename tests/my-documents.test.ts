import { beforeEach, describe, expect, it, vi } from "vitest";

const acceptanceFindMany = vi.fn();
const certificateFindMany = vi.fn();

vi.mock("@/services/prisma", () => ({
	prisma: {
		legalAcceptance: { findMany: (...a: unknown[]) => acceptanceFindMany(...a) },
		certificate: { findMany: (...a: unknown[]) => certificateFindMany(...a) },
	},
}));

const { myDocuments } = await import("@/repositories/legal/my-documents");

beforeEach(() => {
	vi.clearAllMocks();
	acceptanceFindMany.mockResolvedValue([]);
	certificateFindMany.mockResolvedValue([]);
});

describe("myDocuments", () => {
	it("reads only this user's rows, and no revoked certificate", async () => {
		await myDocuments("u1");
		expect(acceptanceFindMany.mock.calls[0][0].where).toEqual({ userId: "u1" });
		expect(certificateFindMany.mock.calls[0][0].where).toEqual({
			userId: "u1",
			revokedAt: null,
		});
	});

	it("links each acceptance to the exact version, and a project agreement to none", async () => {
		acceptanceFindMany.mockResolvedValue([
			{ id: "a1", code: "TermsOfUse", version: 1, context: "SignUp", acceptedAt: new Date(), project: null, checkpoint: null },
			{ id: "a2", code: "CoDevelopmentAgreement", version: 1, context: "ShareChange", acceptedAt: new Date(), project: { name: "Hollow Tide" }, checkpoint: null },
		]);
		const { acceptances } = await myDocuments("u1");
		expect(acceptances.map((a) => a.href)).toEqual(["/legal/terms-of-use/v1", null]);
		expect(acceptances[1].subject).toBe("Hollow Tide");
	});

	it("leaves out an event certificate still waiting for its signature", async () => {
		certificateFindMany.mockResolvedValue([
			{ id: "c1", number: "A", source: "Event", issuedAt: new Date(), externalId: "pending:A", eventMember: { event: { title: "Jam" } }, courseGroupStudent: null, checkpoint: null },
			{ id: "c2", number: "B", source: "Event", issuedAt: new Date(), externalId: "env-1", eventMember: { event: { title: "Jam" } }, courseGroupStudent: null, checkpoint: null },
		]);
		const { certificates } = await myDocuments("u1");
		expect(certificates.map((c) => c.number)).toEqual(["B"]);
	});
});
