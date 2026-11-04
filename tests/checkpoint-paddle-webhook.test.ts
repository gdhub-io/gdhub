import crypto from "node:crypto";
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
import { settleCheckpointCheckout } from "@/services/checkpoints/flows/payment";
import { NovuService } from "@/services/novu";
import { prisma } from "@/services/prisma";

vi.mock("@/services/prisma", () => ({
	prisma: {
		payment: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
		paymentEvent: { create: vi.fn(), deleteMany: vi.fn(async () => ({})) },
		refund: { upsert: vi.fn(), findMany: vi.fn() },
		auditLog: { create: vi.fn() },
		projectCheckpoint: { updateMany: vi.fn() },
		teamVacancy: { update: vi.fn(), updateMany: vi.fn() },
	},
}));

// Settling itself is covered in checkpoint-paddle-settle.test.ts.
vi.mock("@/services/checkpoints/flows/payment", async (importOriginal) => ({
	...(await importOriginal<
		typeof import("@/services/checkpoints/flows/payment")
	>()),
	settleCheckpointCheckout: vi.fn(async () => true),
}));

vi.mock("@/services/novu", () => ({ NovuService: { send: vi.fn() } }));

const SECRET = "whsec_test";

const signed = (raw: string) => {
	const ts = "1700000000";
	const h1 = crypto
		.createHmac("sha256", SECRET)
		.update(`${ts}:${raw}`)
		.digest("hex");
	return `ts=${ts};h1=${h1}`;
};

const post = (body: unknown, signature?: string | null) => {
	const raw = JSON.stringify(body);
	const headers: Record<string, string> = {};
	const value = signature === undefined ? signed(raw) : signature;
	if (value) headers["paddle-signature"] = value;

	return POST(
		new Request("https://gdhub.io/api/paddle/webhooks", {
			method: "POST",
			body: raw,
			headers,
		}) as unknown as NextRequest,
	);
};

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
		items: [{ price: { id: "pri_ai" }, quantity: 1 }],
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
	vi.stubEnv("PADDLE_WEBHOOK_SECRET", SECRET);
	vi.stubEnv("PADDLE_AI_CHECKPOINT_PRICE_ID", "pri_ai");
	vi.stubEnv("NEXT_PUBLIC_PADDLE_VACANCY_PRICE_ID", "pri_vac");
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
	it("refuses an unsigned event", async () => {
		const response = await post(completed(), null);

		expect(response.status).toBe(401);
		expect(settleCheckpointCheckout).not.toHaveBeenCalled();
	});

	it("refuses a forged signature", async () => {
		const response = await post(completed(), "ts=1700000000;h1=00ff");

		expect(response.status).toBe(401);
		expect(settleCheckpointCheckout).not.toHaveBeenCalled();
	});

	// Without a secret nobody can be told from Paddle, sandbox or not.
	it("refuses every event when no secret is set", async () => {
		vi.stubEnv("PADDLE_WEBHOOK_SECRET", "");

		expect((await post(completed())).status).toBe(401);
		expect(settleCheckpointCheckout).not.toHaveBeenCalled();
	});

	// A checkout opened in the browser with our custom data and the vacancy's cheaper price.
	it.each([
		["another price", [{ price: { id: "pri_vac" }, quantity: 1 }]],
		["more than one", [{ price: { id: "pri_ai" }, quantity: 2 }]],
		["extra items", [
			{ price: { id: "pri_ai" }, quantity: 1 },
			{ price: { id: "pri_x" }, quantity: 1 },
		]],
		["no items", undefined],
	])("settles nothing for a transaction at %s", async (_label, items) => {
		const response = await post(completed({ items }));

		expect(response.status).toBe(200);
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

	// Paddle retries a 500; the retry must not read as a duplicate of the failed delivery.
	it("forgets a delivery whose work failed, so the retry runs", async () => {
		vi.mocked(settleCheckpointCheckout).mockRejectedValueOnce(new Error("db"));
		vi.spyOn(console, "error").mockImplementation(() => {});

		const response = await post(completed());

		expect(response.status).toBe(500);
		expect(prisma.paymentEvent.deleteMany).toHaveBeenCalledWith({
			where: { provider: PaymentProvider.PADDLE, eventId: "evt_1" },
		});
	});

	// A redelivery of a settled event failing before it is written must not erase the first delivery's row.
	it("keeps an earlier delivery's row when the work fails before this one is written", async () => {
		vi.mocked(prisma.payment.findUnique).mockRejectedValueOnce(new Error("db"));
		vi.spyOn(console, "error").mockImplementation(() => {});

		expect((await post(completed())).status).toBe(500);
		expect(prisma.paymentEvent.deleteMany).not.toHaveBeenCalled();
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
			completed({
				custom_data: { paymentId: "pay_1", vacancyId: "vac1" },
				items: [{ price: { id: "pri_vac" }, quantity: 1 }],
			}),
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

describe("the Paddle webhook, for a vacancy, refuses", () => {
	beforeEach(() => {
		vi.mocked(prisma.payment.findUnique).mockResolvedValue({
			...checkpointPayment,
			payableType: PayableType.VACANCY,
			payableId: "vac1",
		} as never);
	});

	it.each([
		["the checkpoint's price", { paymentId: "pay_1", vacancyId: "vac1" }, "pri_ai"],
		["another vacancy", { paymentId: "pay_1", vacancyId: "vac2" }, "pri_vac"],
	])("a transaction for %s", async (_label, custom_data, price) => {
		await post(
			completed({ custom_data, items: [{ price: { id: price }, quantity: 1 }] }),
		);

		expect(prisma.payment.updateMany).not.toHaveBeenCalled();
		expect(prisma.teamVacancy.update).not.toHaveBeenCalled();
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

	it("ignores an adjustment that is neither a refund nor a chargeback", async () => {
		await post(adjustment("adjustment.created", { action: "credit" }));

		expect(prisma.paymentEvent.create).not.toHaveBeenCalled();
		expect(prisma.refund.upsert).not.toHaveBeenCalled();
	});

	it("does nothing for an adjustment it has already seen", async () => {
		vi.mocked(prisma.paymentEvent.create).mockRejectedValue({ code: "P2002" });

		await post(adjustment("adjustment.updated"));

		expect(prisma.refund.upsert).not.toHaveBeenCalled();
		expect(prisma.auditLog.create).not.toHaveBeenCalled();
	});

	it("marks a checkpoint payment DISPUTED on a chargeback", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});

		await post(adjustment("adjustment.created", { action: "chargeback" }));

		expect(prisma.payment.update).toHaveBeenCalledWith({
			where: { id: "pay_1" },
			data: { status: PaymentStatus.DISPUTED },
		});
		expect(prisma.refund.upsert).not.toHaveBeenCalled();
	});
});

describe("a Paddle adjustment on a listing fee", () => {
	beforeEach(() => {
		vi.mocked(prisma.payment.findUnique).mockResolvedValue({
			...checkpointPayment,
			payableType: PayableType.VACANCY,
			payableId: "vac1",
			amount: 900,
			status: PaymentStatus.COMPLETED,
		} as never);
	});

	it("records an approved full refund and takes the listing down", async () => {
		await post(adjustment("adjustment.updated", { totals: { total: "900" } }));

		expect(prisma.refund.upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				create: expect.objectContaining({ amount: 900, reason: "paddleRefund" }),
			}),
		);
		expect(prisma.payment.update).toHaveBeenCalledWith({
			where: { id: "pay_1" },
			data: { status: PaymentStatus.REFUNDED },
		});
		expect(prisma.teamVacancy.updateMany).toHaveBeenCalledWith({
			where: { id: "vac1", status: "Published" },
			data: { status: "Closed" },
		});
		expect(prisma.projectCheckpoint.updateMany).not.toHaveBeenCalled();
	});

	it("adds up earlier parts to take the listing down", async () => {
		vi.mocked(prisma.refund.findMany).mockResolvedValue([
			{ amount: 400 },
		] as never);

		await post(adjustment("adjustment.updated", { totals: { total: "500" } }));

		expect(prisma.payment.update).toHaveBeenCalledWith({
			where: { id: "pay_1" },
			data: { status: PaymentStatus.REFUNDED },
		});
		expect(prisma.teamVacancy.updateMany).toHaveBeenCalled();
	});

	it("leaves a listing up after a part refund", async () => {
		await post(adjustment("adjustment.updated", { totals: { total: "300" } }));

		expect(prisma.payment.update).toHaveBeenCalledWith({
			where: { id: "pay_1" },
			data: { status: PaymentStatus.PARTIALLY_REFUNDED },
		});
		expect(prisma.teamVacancy.updateMany).not.toHaveBeenCalled();
	});

	it("waits for Paddle to approve a refund", async () => {
		await post(adjustment("adjustment.created", { status: "pending_approval" }));

		expect(prisma.refund.upsert).not.toHaveBeenCalled();
		expect(prisma.teamVacancy.updateMany).not.toHaveBeenCalled();
	});

	it("marks a chargeback DISPUTED and takes the listing down", async () => {
		await post(
			adjustment("adjustment.created", {
				action: "chargeback",
				status: "pending_approval",
				totals: { total: "900" },
			}),
		);

		expect(prisma.payment.update).toHaveBeenCalledWith({
			where: { id: "pay_1" },
			data: { status: PaymentStatus.DISPUTED },
		});
		expect(prisma.teamVacancy.updateMany).toHaveBeenCalled();
	});
});
