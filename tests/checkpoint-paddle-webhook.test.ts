import {
	AuditAction,
	CheckpointStatus,
	PayableType,
	PaymentProvider,
	PaymentStatus,
} from "@gdhub-io/gdhub-prisma";
import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/paddle/webhooks/route";
import { settleCheckpointCheckout } from "@/repositories/checkpoint-payment";
import { NovuService } from "@/services/novu";
import { prisma } from "@/services/prisma";

vi.mock("@/services/prisma", () => ({
	prisma: {
		payment: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
		paymentEvent: { create: vi.fn() },
		refund: { upsert: vi.fn(), findMany: vi.fn() },
		auditLog: { create: vi.fn() },
		projectCheckpoint: { updateMany: vi.fn() },
		teamVacancy: { update: vi.fn() },
	},
}));

// Settling itself is covered in checkpoint-paddle-settle.test.ts.
vi.mock("@/repositories/checkpoint-payment", async (importOriginal) => ({
	...(await importOriginal<
		typeof import("@/repositories/checkpoint-payment")
	>()),
	settleCheckpointCheckout: vi.fn(async () => true),
}));

vi.mock("@/services/novu", () => ({ NovuService: { send: vi.fn() } }));

const post = (body: unknown) =>
	POST(
		new Request("https://gdhub.io/api/paddle/webhooks", {
			method: "POST",
			body: JSON.stringify(body),
		}) as unknown as NextRequest,
	);

const checkpointPayment = {
	id: "pay_1",
	payableType: PayableType.CHECKPOINT,
	payableId: "cp1",
	amount: 2000,
	currency: "USD",
	provider: PaymentProvider.PADDLE,
	status: PaymentStatus.PENDING,
};

const completed = (over: Record<string, unknown> = {}) => ({
	event_id: "evt_1",
	event_type: "transaction.completed",
	data: {
		id: "txn_1",
		customer_id: "ctm_1",
		invoice_id: "inv_1",
		currency_code: "USD",
		custom_data: { paymentId: "pay_1", checkpointId: "cp1" },
		details: { totals: { grand_total: "1500" } },
		...over,
	},
});

const adjustment = (
	event: "adjustment.created" | "adjustment.updated",
	over: Record<string, unknown> = {},
) => ({
	event_id: "evt_adj",
	event_type: event,
	data: {
		id: "adj_1",
		action: "refund",
		status: "approved",
		transaction_id: "txn_1",
		currency_code: "USD",
		totals: { total: "2000" },
		...over,
	},
});

beforeEach(() => {
	vi.clearAllMocks();
	// Verification is skipped outside production when no secret is set.
	vi.stubEnv("PADDLE_WEBHOOK_SECRET", "");
	vi.mocked(prisma.payment.findUnique).mockResolvedValue(
		checkpointPayment as never,
	);
	vi.mocked(prisma.paymentEvent.create).mockResolvedValue({} as never);
	vi.mocked(prisma.payment.updateMany).mockResolvedValue({ count: 1 });
	// The refunds before this one: none by default.
	vi.mocked(prisma.refund.findMany).mockResolvedValue([]);
});

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("the Paddle webhook, for a checkpoint", () => {
	it("refuses an unsigned event in production", async () => {
		vi.stubEnv("NODE_ENV", "production");

		const response = await post(completed());

		expect(response.status).toBe(401);
		expect(settleCheckpointCheckout).not.toHaveBeenCalled();
	});

	// Paddle charges at once: there is no hold to capture afterwards.
	it("settles a completed transaction at its grand total, not held", async () => {
		const response = await post(completed());

		expect(response.status).toBe(200);
		expect(settleCheckpointCheckout).toHaveBeenCalledWith(checkpointPayment, {
			transactionId: "txn_1",
			amount: 1500,
			customerId: "ctm_1",
			invoiceId: "inv_1",
			charged: true,
			held: false,
		});
		// The vacancy path's direct COMPLETED write must not run for a checkpoint.
		expect(prisma.payment.updateMany).not.toHaveBeenCalled();
	});

	it("reads a zero grand total as nothing charged", async () => {
		await post(completed({ details: { totals: { grand_total: "0" } } }));

		expect(settleCheckpointCheckout).toHaveBeenCalledWith(
			checkpointPayment,
			expect.objectContaining({ amount: 0, charged: false }),
		);
	});

	it("settles with an unknown amount when Paddle sends no total", async () => {
		await post(completed({ details: {} }));

		expect(settleCheckpointCheckout).toHaveBeenCalledWith(
			checkpointPayment,
			expect.objectContaining({ amount: null, charged: true }),
		);
	});

	// A payment id lifted from another checkout must not start this checkpoint.
	it("settles nothing when the checkpoint in custom data is not the payment's", async () => {
		const response = await post(
			completed({ custom_data: { paymentId: "pay_1", checkpointId: "cp2" } }),
		);

		expect(response.status).toBe(200);
		expect(settleCheckpointCheckout).not.toHaveBeenCalled();
		expect(prisma.payment.updateMany).not.toHaveBeenCalled();
	});

	it("does nothing for a delivery it has already seen", async () => {
		vi.mocked(prisma.paymentEvent.create).mockRejectedValue({ code: "P2002" });

		const response = await post(completed());

		expect(response.status).toBe(200);
		expect(settleCheckpointCheckout).not.toHaveBeenCalled();
	});

	// The providers never cross: a Paddle event cannot settle a row Stripe took.
	it("settles nothing for a payment another provider took", async () => {
		vi.mocked(prisma.payment.findUnique).mockResolvedValue({
			...checkpointPayment,
			provider: PaymentProvider.STRIPE,
		} as never);

		expect((await post(completed())).status).toBe(200);
		expect(settleCheckpointCheckout).not.toHaveBeenCalled();
		expect(prisma.payment.updateMany).not.toHaveBeenCalled();
	});

	it("records no refund against a payment Stripe took", async () => {
		vi.mocked(prisma.payment.findUnique).mockResolvedValue({
			...checkpointPayment,
			provider: PaymentProvider.STRIPE,
		} as never);

		await post(adjustment("adjustment.created"));

		expect(prisma.refund.upsert).not.toHaveBeenCalled();
		expect(prisma.payment.update).not.toHaveBeenCalled();
	});

	it("does nothing for a transaction with no payment of ours", async () => {
		vi.mocked(prisma.payment.findUnique).mockResolvedValue(null);

		expect((await post(completed())).status).toBe(200);
		expect(settleCheckpointCheckout).not.toHaveBeenCalled();
	});
});

describe("the Paddle webhook, for a vacancy", () => {
	it("still completes the payment and publishes the vacancy", async () => {
		vi.mocked(prisma.payment.findUnique).mockResolvedValue({
			...checkpointPayment,
			payableType: PayableType.VACANCY,
			payableId: "vac1",
		} as never);
		vi.mocked(prisma.teamVacancy.update).mockResolvedValue({
			title: "Artist",
			team: {
				project: { slug: "tide", author: { id: "a1", email: "a@x.io" } },
			},
		} as never);

		const response = await post(
			completed({ custom_data: { paymentId: "pay_1" } }),
		);

		expect(response.status).toBe(200);
		expect(settleCheckpointCheckout).not.toHaveBeenCalled();
		expect(prisma.payment.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "pay_1", status: { not: "COMPLETED" } },
				data: expect.objectContaining({
					status: "COMPLETED",
					amount: 1500,
					providerTransactionId: "txn_1",
				}),
			}),
		);
		expect(prisma.teamVacancy.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "vac1" },
				data: expect.objectContaining({ status: "Published" }),
			}),
		);
		expect(NovuService.send).toHaveBeenCalled();
	});
});

describe("a Paddle refund adjustment", () => {
	beforeEach(() => {
		vi.mocked(prisma.payment.findUnique).mockResolvedValue({
			...checkpointPayment,
			status: PaymentStatus.COMPLETED,
		} as never);
	});

	it("finds the payment by its Paddle transaction", async () => {
		await post(adjustment("adjustment.created"));

		expect(prisma.payment.findUnique).toHaveBeenCalledWith({
			where: { providerTransactionId: "txn_1" },
		});
	});

	// Paddle decides refunds itself; a rejected one is for an admin to settle by hand.
	it.each(["rejected", "reversed"])(
		"logs a %s refund for an admin and writes no refund",
		async (status) => {
			const response = await post(
				adjustment("adjustment.updated", { status }),
			);

			expect(response.status).toBe(200);
			expect(prisma.auditLog.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					entity: "checkpoint",
					entityId: "cp1",
					action: AuditAction.UPDATE,
					meta: expect.objectContaining({
						action: "paddleRefundRefused",
						adjustmentId: "adj_1",
						status,
					}),
				}),
			});
			expect(prisma.refund.upsert).not.toHaveBeenCalled();
			expect(prisma.payment.update).not.toHaveBeenCalled();
			expect(prisma.projectCheckpoint.updateMany).not.toHaveBeenCalled();
		},
	);

	it("writes one refund per adjustment and marks a full one REFUNDED", async () => {
		await post(adjustment("adjustment.created"));

		expect(prisma.refund.upsert).toHaveBeenCalledWith({
			where: { providerRefundId: "adj_1" },
			create: expect.objectContaining({
				paymentId: "pay_1",
				amount: 2000,
				currency: "USD",
				providerRefundId: "adj_1",
			}),
			// The row the admin's own refund wrote is kept as it is.
			update: {},
		});
		expect(prisma.refund.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { paymentId: "pay_1", providerRefundId: { not: "adj_1" } },
			}),
		);
		expect(prisma.payment.update).toHaveBeenCalledWith({
			where: { id: "pay_1" },
			data: { status: PaymentStatus.REFUNDED },
		});
	});

	// Paddle approves refunds itself: until it does, nothing is money back yet.
	it("changes nothing for a refund still waiting for Paddle's approval", async () => {
		await post(adjustment("adjustment.created", { status: "pending_approval" }));

		expect(prisma.refund.upsert).not.toHaveBeenCalled();
		expect(prisma.payment.update).not.toHaveBeenCalled();
		expect(prisma.projectCheckpoint.updateMany).not.toHaveBeenCalled();
	});

	// Money back in full closes a checkpoint that never ran, never a running one.
	it("cancels only a checkpoint that never started on a full refund", async () => {
		await post(adjustment("adjustment.created"));

		expect(prisma.projectCheckpoint.updateMany).toHaveBeenCalledWith({
			where: {
				id: "cp1",
				status: {
					in: [CheckpointStatus.Draft, CheckpointStatus.AwaitingCurator],
				},
			},
			data: { status: CheckpointStatus.Cancelled },
		});
	});

	it("marks a part PARTIALLY_REFUNDED and leaves the checkpoint alone", async () => {
		await post(adjustment("adjustment.created", { totals: { total: "700" } }));

		expect(prisma.refund.upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				create: expect.objectContaining({ amount: 700 }),
			}),
		);
		expect(prisma.payment.update).toHaveBeenCalledWith({
			where: { id: "pay_1" },
			data: { status: PaymentStatus.PARTIALLY_REFUNDED },
		});
		expect(prisma.projectCheckpoint.updateMany).not.toHaveBeenCalled();
	});

	it("adds up earlier parts to tell a whole refund", async () => {
		vi.mocked(prisma.refund.findMany).mockResolvedValue([
			{ amount: 1300 },
		] as never);

		await post(adjustment("adjustment.created", { totals: { total: "700" } }));

		expect(prisma.payment.update).toHaveBeenCalledWith({
			where: { id: "pay_1" },
			data: { status: PaymentStatus.REFUNDED },
		});
	});

	it("ignores an adjustment that is not a refund", async () => {
		await post(adjustment("adjustment.created", { action: "chargeback" }));

		expect(prisma.paymentEvent.create).not.toHaveBeenCalled();
		expect(prisma.refund.upsert).not.toHaveBeenCalled();
	});

	it("does nothing for an adjustment it has already seen", async () => {
		vi.mocked(prisma.paymentEvent.create).mockRejectedValue({ code: "P2002" });

		await post(adjustment("adjustment.updated"));

		expect(prisma.refund.upsert).not.toHaveBeenCalled();
		expect(prisma.auditLog.create).not.toHaveBeenCalled();
	});

	it("leaves a vacancy refund to the vacancy flow", async () => {
		vi.mocked(prisma.payment.findUnique).mockResolvedValue({
			...checkpointPayment,
			payableType: PayableType.VACANCY,
		} as never);

		await post(adjustment("adjustment.created"));

		expect(prisma.refund.upsert).not.toHaveBeenCalled();
		expect(prisma.payment.update).not.toHaveBeenCalled();
	});
});
