import {
	CheckpointCuratorKind,
	CheckpointSessionContentStatus,
	CheckpointStatus,
} from "@gdhub-io/gdhub-prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CHECKPOINT_AI_PRICE, CURATOR_PRICE } from "@/config/checkpoint";
import {
	providedParts,
	type RefundCase,
	reasonRefused,
	refundAmount,
} from "@/lib/checkpoint-refund";
import { issueCheckpointRefund } from "@/repositories/checkpoint-refund";
import { notifyAuthorOfRefund } from "@/services/checkpoint-notifications";
import { prisma } from "@/services/prisma";
import { refundCheckoutPart } from "@/services/stripe/server";

vi.mock("@/services/prisma", () => ({
	prisma: {
		$transaction: vi.fn(async (ops: unknown[]) => ops),
		projectCheckpoint: { findUnique: vi.fn(), update: vi.fn() },
		payment: { findFirst: vi.fn(), update: vi.fn() },
		refund: { upsert: vi.fn() },
		auditLog: { create: vi.fn() },
	},
}));
vi.mock("@/services/stripe/server", () => ({ refundCheckoutPart: vi.fn() }));
vi.mock("@/services/checkpoint-notifications", () => ({
	notifyAuthorOfRefund: vi.fn(),
}));
vi.mock("@/services/chat/checkpoint-room", () => ({
	closeCheckpointRoom: vi.fn(),
	syncChat: vi.fn(async () => undefined),
}));

const NOW = new Date("2026-10-20T12:00:00.000Z");

const call = (index: number, held: boolean) => ({
	index,
	curatorJoinedAt: held ? new Date("2026-10-01T10:00:00.000Z") : null,
	contentStatus: null,
});

const review = (index: number, written: boolean) => ({
	index,
	curatorJoinedAt: null,
	contentStatus: written ? CheckpointSessionContentStatus.Ready : null,
});

const human = (over: Partial<RefundCase> = {}): RefundCase => ({
	curatorKind: CheckpointCuratorKind.Human,
	status: CheckpointStatus.Active,
	paid: CURATOR_PRICE.Expert * 100,
	paidAt: new Date("2026-10-12T09:00:00.000Z"),
	dueAt: new Date("2026-11-10T00:00:00.000Z"),
	verdictSent: false,
	sessions: [1, 2, 3, 4, 5].map((index) => call(index, index <= 2)),
	...over,
});

describe("what a checkpoint owes back", () => {
	it("keeps a part for each held call and the sent verdict", () => {
		expect(providedParts(human())).toBe(2);
		expect(
			providedParts(
				human({
					verdictSent: true,
					sessions: [1, 2, 3, 4, 5].map((index) => call(index, true)),
				}),
			),
		).toBe(6);
	});

	it("counts the AI's reviews before the final one, and the verdict", () => {
		const ai = human({
			curatorKind: CheckpointCuratorKind.AI,
			paid: CHECKPOINT_AI_PRICE * 100,
			sessions: [
				review(1, true),
				review(2, true),
				review(3, false),
				review(4, false),
				review(5, true),
			],
		});

		expect(providedParts(ai)).toBe(1);
		expect(refundAmount(ai)).toMatchObject({ parts: 4, part: 500, refund: 1500 });
	});

	it("refunds $300 of $450 after two calls, and $240 of $360 with a code", () => {
		expect(refundAmount(human()).refund).toBe(30000);
		expect(refundAmount(human({ paid: 36000 })).refund).toBe(24000);
	});

	it("rounds what is kept down, so a stray cent goes to the author", () => {
		// 33 333 × 2 ÷ 6 = 11 111 exactly; 33 334 leaves a remainder.
		expect(refundAmount(human({ paid: 33334 })).refund).toBe(33334 - 11111);
	});

	it("gives nothing back once everything was delivered", () => {
		const delivered = human({
			verdictSent: true,
			sessions: [1, 2, 3, 4, 5].map((index) => call(index, true)),
		});
		expect(refundAmount(delivered).refund).toBe(0);
	});
});

describe("when each reason applies", () => {
	it("allows withdrawal only within 14 days of paying", () => {
		expect(reasonRefused(human(), "withdrawal", NOW)).toBeNull();
		expect(
			reasonRefused(
				human({ paidAt: new Date("2026-10-05T11:00:00.000Z") }),
				"withdrawal",
				NOW,
			),
		).toBe("withdrawalOver");
	});

	it("blames only a curator who is a person", () => {
		expect(reasonRefused(human(), "curatorGone", NOW)).toBeNull();
		expect(
			reasonRefused(
				human({ curatorKind: CheckpointCuratorKind.AI }),
				"curatorGone",
				NOW,
			),
		).toBe("notHuman");
	});

	it("counts a verdict as missing only after day 31", () => {
		const due = { dueAt: new Date("2026-10-10T00:00:00.000Z") };
		expect(reasonRefused(human(due), "noVerdict", NOW)).toBeNull();
		expect(reasonRefused(human(), "noVerdict", NOW)).toBe("verdictNotOverdue");
		expect(
			reasonRefused(human({ ...due, verdictSent: true }), "noVerdict", NOW),
		).toBe("verdictNotOverdue");
	});

	it("refunds nothing on a checkpoint that is not running", () => {
		for (const status of [
			CheckpointStatus.AwaitingCurator,
			CheckpointStatus.Closed,
			CheckpointStatus.Cancelled,
		]) {
			expect(reasonRefused(human({ status }), "withdrawal", NOW)).toBe(
				"notRunning",
			);
		}
	});
});

describe("issuing a refund", () => {
	const payment = (refunds: unknown[] = []) => ({
		id: "pay1",
		amount: 45000,
		currency: "USD",
		createdAt: new Date("2026-10-12T09:00:00.000Z"),
		providerTransactionId: "cs_1",
		refunds,
	});

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue({
			curatorKind: CheckpointCuratorKind.Human,
			status: CheckpointStatus.Active,
			dueAt: new Date("2026-11-10T00:00:00.000Z"),
			verdict: null,
			sessions: [1, 2, 3, 4, 5].map((index) => call(index, index <= 2)),
		} as never);
		vi.mocked(prisma.payment.findFirst).mockResolvedValue(payment() as never);
		vi.mocked(refundCheckoutPart).mockResolvedValue({
			id: "re_1",
			amount: 30000,
			currency: "usd",
		} as never);
	});

	it("sends the computed sum once, keyed to the checkpoint", async () => {
		const result = await issueCheckpointRefund("cp1", "withdrawal", "admin1", NOW);

		expect(result).toEqual({ ok: true, amount: 30000 });
		expect(refundCheckoutPart).toHaveBeenCalledWith(
			"cs_1",
			30000,
			"checkpoint-refund-cp1",
		);
		expect(prisma.projectCheckpoint.update).toHaveBeenCalledWith({
			where: { id: "cp1" },
			data: { status: CheckpointStatus.Cancelled },
		});
		expect(prisma.payment.update).toHaveBeenCalledWith({
			where: { id: "pay1" },
			data: { status: "PARTIALLY_REFUNDED" },
		});
		expect(prisma.auditLog.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					actorUserId: "admin1",
					entity: "checkpoint_refund",
					entityId: "cp1",
				}),
			}),
		);
		expect(notifyAuthorOfRefund).toHaveBeenCalledWith("cp1", "$300", "withdrawal");
	});

	it("sends nothing when the payment already has a refund", async () => {
		vi.mocked(prisma.payment.findFirst).mockResolvedValue(
			payment([{ amount: 30000, reason: "withdrawal", createdAt: NOW }]) as never,
		);

		await expect(
			issueCheckpointRefund("cp1", "withdrawal", "admin1", NOW),
		).resolves.toEqual({ ok: false, error: "alreadyRefunded" });
		expect(refundCheckoutPart).not.toHaveBeenCalled();
	});

	it("writes nothing when Stripe refuses", async () => {
		vi.mocked(refundCheckoutPart).mockRejectedValue(new Error("card"));

		await expect(
			issueCheckpointRefund("cp1", "withdrawal", "admin1", NOW),
		).resolves.toEqual({ ok: false, error: "refundFailed" });
		expect(prisma.$transaction).not.toHaveBeenCalled();
		expect(notifyAuthorOfRefund).not.toHaveBeenCalled();
	});

	it("refuses a reason that does not apply before asking Stripe", async () => {
		await expect(
			issueCheckpointRefund("cp1", "noVerdict", "admin1", NOW),
		).resolves.toEqual({ ok: false, error: "verdictNotOverdue" });
		expect(refundCheckoutPart).not.toHaveBeenCalled();
	});
});
