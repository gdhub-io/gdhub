import { beforeEach, describe, expect, it, vi } from "vitest";
import { curatorStatusOf } from "@/lib/checkpoints/curator-status";
import { saveCuration } from "@/repositories/checkpoints/curator-approval";
import { curatorEligibleWhere } from "@/repositories/checkpoints/curator-catalog";
import { needsAcceptance } from "@/repositories/legal.repository";
import { decideCurator } from "@/services/checkpoints/flows/curator-approval";
import { notify } from "@/services/checkpoints/notifications";
import { prisma } from "@/services/prisma";

vi.mock("@/services/prisma", () => ({
	prisma: {
		expertProfile: { findUnique: vi.fn(), update: vi.fn() },
		workflowSchema: { findMany: vi.fn() },
		auditLog: { create: vi.fn() },
		$transaction: vi.fn(),
	},
}));
vi.mock("@/repositories/legal.repository", () => ({
	latestAcceptance: vi.fn(),
	needsAcceptance: vi.fn(),
}));
vi.mock("@/services/checkpoints/notifications", () => ({
	notify: vi.fn(),
	appUrl: () => "",
}));

const NOW = new Date("2026-10-20T12:00:00.000Z");
const ready = {
	curation: false,
	curatorStages: [],
	curatorRequestedAt: null,
	curatorApprovedAt: null,
	curatorReviewNote: null,
	payoutHolder: "Anna",
	payoutAccount: "LT121000011101001000",
	invoicing: "SelfEmployed",
	user: { id: "u1", email: "a@x" },
};

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(needsAcceptance).mockReturnValue(false);
	vi.mocked(prisma.workflowSchema.findMany).mockResolvedValue([
		{ steps: [{ name: "Concepting" }, { name: "Prototyping" }] },
	] as never);
	vi.mocked(prisma.expertProfile.findUnique).mockResolvedValue(ready as never);
});

describe("a curator's status", () => {
	it("is approved, waiting, or not approved — a decline and a revoke alike", () => {
		const base = { curatorRequestedAt: NOW, curatorApprovedAt: null, curatorReviewNote: null };
		expect(curatorStatusOf({ ...base, curatorRequestedAt: null })).toBeNull();
		expect(curatorStatusOf(base)).toBe("pending");
		expect(curatorStatusOf({ ...base, curatorApprovedAt: NOW })).toBe("approved");
		expect(curatorStatusOf({ ...base, curatorReviewNote: "No release" })).toBe(
			"notApproved",
		);
	});
});

describe("offering to curate", () => {
	it("stays locked until the terms and the payout details are in", async () => {
		vi.mocked(needsAcceptance).mockReturnValue(true);

		await expect(
			saveCuration("u1", { on: true, stages: ["Concepting"] }, NOW),
		).resolves.toEqual({ ok: false, error: "locked" });
		expect(prisma.expertProfile.update).not.toHaveBeenCalled();
	});

	it("asks an admin the first time it is turned on, and keeps only known stages", async () => {
		await saveCuration("u1", { on: true, stages: ["Concepting", "Made up"] }, NOW);

		expect(prisma.expertProfile.update).toHaveBeenCalledWith({
			where: { userId: "u1" },
			data: { curation: true, curatorStages: ["Concepting"], curatorRequestedAt: NOW },
		});
	});

	it("changes the stages of an approved curator with no new review", async () => {
		vi.mocked(prisma.expertProfile.findUnique).mockResolvedValue({
			...ready,
			curation: true,
			curatorRequestedAt: NOW,
			curatorApprovedAt: NOW,
		} as never);

		await saveCuration("u1", { on: true, stages: ["Prototyping"] }, NOW);

		expect(vi.mocked(prisma.expertProfile.update).mock.calls[0][0].data).toEqual({
			curation: true,
			curatorStages: ["Prototyping"],
		});
	});
});

describe("an admin's decision", () => {
	const waiting = { ...ready, curation: true, curatorRequestedAt: NOW };

	it("approves a waiting curator and tells them", async () => {
		vi.mocked(prisma.expertProfile.findUnique).mockResolvedValue(waiting as never);

		await expect(decideCurator("admin1", "u1", { action: "approve" }, NOW)).resolves.toEqual({
			ok: true,
		});
		expect(prisma.expertProfile.update).toHaveBeenCalledWith({
			where: { userId: "u1" },
			data: { curatorApprovedAt: NOW, curatorReviewNote: null },
		});
		expect(notify).toHaveBeenCalled();
	});

	it("refuses to decide twice, and to revoke someone not approved", async () => {
		vi.mocked(prisma.expertProfile.findUnique).mockResolvedValue({
			...waiting,
			curatorApprovedAt: NOW,
		} as never);
		await expect(decideCurator("admin1", "u1", { action: "approve" }, NOW)).resolves.toEqual({
			ok: false,
			error: "alreadyDecided",
		});

		vi.mocked(prisma.expertProfile.findUnique).mockResolvedValue(waiting as never);
		await expect(
			decideCurator("admin1", "u1", { action: "revoke", note: "Gone quiet" }, NOW),
		).resolves.toEqual({ ok: false, error: "alreadyDecided" });
		expect(notify).not.toHaveBeenCalled();
	});

	it("keeps the note out of the audit log", async () => {
		vi.mocked(prisma.expertProfile.findUnique).mockResolvedValue(waiting as never);

		await decideCurator("admin1", "u1", { action: "decline", note: "No shipped game" }, NOW);

		expect(prisma.auditLog.create).toHaveBeenCalledWith({
			data: expect.objectContaining({ meta: { action: "decline" } }),
		});
	});
});

describe("who authors are offered", () => {
	it("is an approved curator with curation on who curates the stage", () => {
		expect(curatorEligibleWhere("Prototyping").user).toEqual({
			expertProfile: {
				curation: true,
				curatorApprovedAt: { not: null },
				curatorStages: { has: "Prototyping" },
			},
		});
	});
});
