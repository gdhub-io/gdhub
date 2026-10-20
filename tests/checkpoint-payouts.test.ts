import { CheckpointFeeReason, ExpertInvoicing } from "@gdhub-io/gdhub-prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { recordCheckpointFee } from "@/repositories/checkpoint-fee";
import {
	markPayoutPaid,
	maskAccount,
	payoutStatus,
} from "@/repositories/checkpoint-payouts";
import { refundCaseOf } from "@/repositories/checkpoint-refund";
import { notify } from "@/services/checkpoint-notifications";
import { prisma } from "@/services/prisma";

vi.mock("@/services/prisma", () => {
	const client = {
		expertProfile: { findUnique: vi.fn() },
		checkpointFee: { findMany: vi.fn(), updateMany: vi.fn(), upsert: vi.fn() },
		curatorPayout: { count: vi.fn(), create: vi.fn(), findUnique: vi.fn() },
		user: { findUnique: vi.fn() },
		auditLog: { create: vi.fn(), findMany: vi.fn() },
		projectCheckpoint: { findUnique: vi.fn() },
		$transaction: vi.fn(),
	};
	client.$transaction.mockImplementation(async (arg: unknown) =>
		typeof arg === "function" ? (arg as (tx: unknown) => unknown)(client) : arg,
	);
	return { prisma: client };
});
vi.mock("@/services/checkpoint-notifications", () => ({
	notify: vi.fn(),
	appUrl: () => "",
}));
vi.mock("@/repositories/checkpoint-number", () => ({ checkpointNumber: vi.fn() }));
vi.mock("@/repositories/checkpoint-refund", () => ({ refundCaseOf: vi.fn() }));

const NOW = new Date("2026-10-20T12:00:00.000Z");
const SEPTEMBER = new Date("2026-09-01T00:00:00.000Z");
const seen = new Date("2026-10-20T11:00:00.000Z");
const input = {
	curatorId: "c1",
	month: SEPTEMBER,
	paidOn: new Date("2026-10-20"),
	reference: "SEB-1",
	detailsSeenAt: seen,
};
const details = {
	payoutHolder: "Anna Novak",
	payoutAccount: "LT121000011101001000",
	invoicing: ExpertInvoicing.SelfEmployed,
	payoutDetailsChangedAt: new Date("2026-10-01"),
};

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(prisma.$transaction).mockImplementation((async (arg: unknown) =>
		typeof arg === "function"
			? (arg as (tx: unknown) => unknown)(prisma)
			: arg) as never);
	vi.mocked(prisma.expertProfile.findUnique).mockResolvedValue(details as never);
	vi.mocked(prisma.checkpointFee.findMany).mockResolvedValue([
		{ id: "f1", amount: 31500 },
		{ id: "f2", amount: 15750 },
	] as never);
	vi.mocked(prisma.checkpointFee.updateMany).mockResolvedValue({ count: 2 } as never);
	vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "c1", email: "a@x" } as never);
	vi.mocked(prisma.curatorPayout.count).mockResolvedValue(0 as never);
	vi.mocked(prisma.curatorPayout.create).mockResolvedValue({ id: "p1" } as never);
});

describe("marking a month paid", () => {
	it("pays the month's unpaid fees as the server reads them, and tells the curator", async () => {
		await expect(markPayoutPaid("admin1", input, NOW)).resolves.toEqual({
			ok: true,
			amount: 47250,
		});
		expect(prisma.checkpointFee.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					curatorId: "c1",
					payoutId: null,
					earnedAt: {
						gte: SEPTEMBER,
						lt: new Date("2026-10-01T00:00:00.000Z"),
					},
				},
			}),
		);
		expect(prisma.curatorPayout.create).toHaveBeenCalledWith({
			data: expect.objectContaining({ amount: 47250, paidById: "admin1" }),
		});
		expect(notify).toHaveBeenCalled();
	});

	it("refuses details that changed after the admin read them", async () => {
		vi.mocked(prisma.expertProfile.findUnique).mockResolvedValue({
			...details,
			payoutDetailsChangedAt: new Date("2026-10-20T11:30:00.000Z"),
		} as never);

		await expect(markPayoutPaid("admin1", input, NOW)).resolves.toEqual({
			ok: false,
			error: "detailsChanged",
		});
		expect(prisma.curatorPayout.create).not.toHaveBeenCalled();
	});

	it("refuses a curator with no details, and a month not over yet", async () => {
		vi.mocked(prisma.expertProfile.findUnique).mockResolvedValueOnce(null);
		await expect(markPayoutPaid("admin1", input, NOW)).resolves.toEqual({
			ok: false,
			error: "noDetails",
		});
		await expect(
			markPayoutPaid(
				"admin1",
				{ ...input, month: new Date("2026-10-01T00:00:00.000Z") },
				NOW,
			),
		).resolves.toEqual({ ok: false, error: "notDue" });
	});

	it("pays a month once: a second click finds the first payout", async () => {
		vi.mocked(prisma.curatorPayout.count).mockResolvedValue(1 as never);
		vi.mocked(prisma.curatorPayout.findUnique).mockResolvedValue({
			paidOn: new Date("2026-10-20"),
			reference: "SEB-1",
			paidBy: { name: "Dmitry" },
		} as never);

		await expect(markPayoutPaid("admin1", input, NOW)).resolves.toMatchObject({
			ok: false,
			error: "alreadyPaid",
			paid: { reference: "SEB-1", paidBy: "Dmitry" },
		});
		expect(notify).not.toHaveBeenCalled();
	});

	it("gives way when another admin's payout took the fees meanwhile", async () => {
		vi.mocked(prisma.checkpointFee.updateMany).mockResolvedValue({ count: 1 } as never);
		vi.mocked(prisma.curatorPayout.findUnique).mockResolvedValue(null);

		await expect(markPayoutPaid("admin1", input, NOW)).resolves.toMatchObject({
			ok: false,
			error: "alreadyPaid",
		});
		expect(notify).not.toHaveBeenCalled();
	});
});

describe("a payout's status", () => {
	it("is not due in its own month, due until the 15th after, then late", () => {
		expect(payoutStatus(new Date("2026-10-01T00:00:00Z"), false, NOW)).toBe("notDue");
		expect(payoutStatus(SEPTEMBER, false, NOW)).toBe("late");
		expect(
			payoutStatus(SEPTEMBER, false, new Date("2026-10-14T12:00:00Z")),
		).toBe("due");
		expect(payoutStatus(SEPTEMBER, true, NOW)).toBe("paid");
	});

	it("shows an account by its ends only", () => {
		expect(maskAccount("LT12 1000 0111 0100 1000")).toBe("LT12 •••• 1000");
		expect(maskAccount("1234")).toBe("••••");
	});
});

describe("recording a fee", () => {
	const paidCase = {
		refund: {
			curatorKind: "Human",
			verdictSent: true,
			sessions: [1, 2, 3, 4, 5].map((index) => ({
				index,
				curatorJoinedAt: new Date("2026-10-01"),
			})),
		},
		payment: { amount: 45000, refunds: [] },
	};

	beforeEach(() => {
		vi.mocked(refundCaseOf).mockResolvedValue(paidCase as never);
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue({
			curatorId: "c2",
			decidedById: "c2",
			decidedAt: new Date("2026-10-18"),
		} as never);
	});

	it("pays a replacement from the call their audit row names", async () => {
		vi.mocked(prisma.auditLog.findMany).mockResolvedValue([
			{
				meta: {
					action: "curatorAssigned",
					fromCuratorId: "c1",
					toCuratorId: "c2",
					fromSession: 4,
				},
			},
		] as never);

		await recordCheckpointFee("cp1", NOW);

		expect(prisma.checkpointFee.upsert).toHaveBeenCalledWith({
			where: { checkpointId_curatorId: { checkpointId: "cp1", curatorId: "c2" } },
			create: expect.objectContaining({
				amount: 15750,
				parts: 3,
				reason: CheckpointFeeReason.Replacement,
				earnedAt: new Date("2026-10-18"),
			}),
			// Frozen: a second run changes nothing.
			update: {},
		});
	});
});
