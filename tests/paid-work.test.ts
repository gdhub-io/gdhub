import { ExpertInvoicing } from "@gdhub-io/gdhub-prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { validPayoutAccount } from "@/lib/payout-account";
import {
	latestAcceptance,
	needsAcceptance,
} from "@/repositories/legal.repository";
import { savePaidWork } from "@/repositories/paid-work";
import { notify } from "@/services/checkpoint-notifications";
import { prisma } from "@/services/prisma";

vi.mock("@/services/prisma", () => ({
	prisma: {
		expertProfile: { findUnique: vi.fn(), upsert: vi.fn() },
		user: { findUnique: vi.fn() },
		legalAcceptance: { createMany: vi.fn() },
		auditLog: { create: vi.fn() },
		$transaction: vi.fn(),
	},
}));
vi.mock("@/repositories/legal.repository", () => ({
	latestAcceptance: vi.fn(),
	needsAcceptance: vi.fn(),
}));
vi.mock("@/lib/legal/accept", () => ({
	resolveLegal: vi.fn(() => [{ code: "ExpertServicesTerms" }]),
}));
vi.mock("@/services/checkpoint-notifications", () => ({
	notify: vi.fn(),
	appUrl: () => "",
}));

const NOW = new Date("2026-10-20T12:00:00.000Z");
const meta = { ipAddress: null, userAgent: null };
const saved = {
	payoutHolder: "Anna Novak",
	payoutAccount: "LT121000011101001000",
	invoicing: ExpertInvoicing.SelfEmployed,
};

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "u1", email: "a@x" } as never);
	vi.mocked(latestAcceptance).mockResolvedValue({
		version: 1,
		acceptedAt: NOW,
	} as never);
	vi.mocked(needsAcceptance).mockReturnValue(false);
});

const upserted = () =>
	vi.mocked(prisma.expertProfile.upsert).mock.calls[0][0].update as Record<
		string,
		unknown
	>;

describe("saving payout details", () => {
	it("stamps the change, so a payout prepared on the old details is refused", async () => {
		vi.mocked(prisma.expertProfile.findUnique).mockResolvedValue(saved as never);

		await savePaidWork(
			"u1",
			{ holder: "Anna Novak", invoicing: ExpertInvoicing.Company },
			meta,
			NOW,
		);

		expect(upserted().payoutDetailsChangedAt).toEqual(NOW);
		// Kept: the browser never sends the saved account back.
		expect(upserted().payoutAccount).toBe(saved.payoutAccount);
	});

	it("leaves the stamp alone when nothing changed", async () => {
		vi.mocked(prisma.expertProfile.findUnique).mockResolvedValue(saved as never);

		await savePaidWork(
			"u1",
			{ holder: " Anna Novak ", invoicing: ExpertInvoicing.SelfEmployed },
			meta,
			NOW,
		);

		expect(upserted()).not.toHaveProperty("payoutDetailsChangedAt");
		expect(prisma.auditLog.create).not.toHaveBeenCalled();
	});

	it("tells the owner when the account changes, against a hijacked login", async () => {
		vi.mocked(prisma.expertProfile.findUnique).mockResolvedValue(saved as never);

		await savePaidWork(
			"u1",
			{
				holder: "Anna Novak",
				account: "de89 3704 0044 0532 0130 00",
				invoicing: ExpertInvoicing.SelfEmployed,
			},
			meta,
			NOW,
		);

		expect(upserted().payoutAccount).toBe("DE89370400440532013000");
		expect(notify).toHaveBeenCalled();
	});

	it("needs an account the first time, and records the terms with it", async () => {
		vi.mocked(prisma.expertProfile.findUnique).mockResolvedValue(null);
		vi.mocked(needsAcceptance).mockReturnValue(true);

		await expect(
			savePaidWork(
				"u1",
				{ holder: "Anna Novak", invoicing: ExpertInvoicing.SelfEmployed },
				meta,
				NOW,
			),
		).resolves.toEqual({ ok: false, error: "accountRequired" });

		await savePaidWork(
			"u1",
			{
				holder: "Anna Novak",
				account: "LT121000011101001000",
				invoicing: ExpertInvoicing.SelfEmployed,
			},
			meta,
			NOW,
		);
		expect(prisma.legalAcceptance.createMany).toHaveBeenCalled();
		expect(notify).not.toHaveBeenCalled();
	});
});

describe("a payout account", () => {
	it("checks an IBAN's digits, and wants eight digits otherwise", () => {
		expect(validPayoutAccount("DE89 3704 0044 0532 0130 00")).toBe(true);
		expect(validPayoutAccount("DE88 3704 0044 0532 0130 00")).toBe(false);
		expect(validPayoutAccount("12-345-678")).toBe(true);
		expect(validPayoutAccount("1234567")).toBe(false);
	});
});
