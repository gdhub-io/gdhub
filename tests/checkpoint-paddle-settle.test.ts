import {
	CheckpointCuratorKind,
	CheckpointStatus,
	PaymentProvider,
	PaymentStatus,
} from "@gdhub-io/gdhub-prisma";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	reconcileCheckout,
	settleCheckpointCheckout,
} from "@/repositories/checkpoint-payment";
import type { CheckoutPaid } from "@/services/payments/gateway";
import { prisma } from "@/services/prisma";
import { captureCheckout, releaseCheckout } from "@/services/stripe/server";

const sdk = vi.hoisted(() => ({ transactions: { get: vi.fn() } }));

// The profile behind the curator's character is not what these test.
vi.mock("@/repositories/curator-context", async (actual) => ({
	...(await actual<typeof import("@/repositories/curator-context")>()),
	curatorPersona: vi.fn(async () => ({ genres: [], settings: [], levels: [] })),
}));
vi.mock("@paddle/paddle-node-sdk", async (importOriginal) => ({
	...(await importOriginal<typeof import("@paddle/paddle-node-sdk")>()),
	Paddle: class {
		transactions = sdk.transactions;
	},
}));

vi.mock("@/repositories/advisor-availability", () => ({
	isFirstCallFree: vi.fn(async () => true),
	bookSessions: vi.fn(async () => undefined),
	SlotTakenError: class SlotTakenError extends Error {},
}));

vi.mock("@/services/prisma", () => ({
	prisma: {
		$transaction: vi.fn(),
		checkpointSession: { deleteMany: vi.fn(), createMany: vi.fn() },
		payment: { update: vi.fn(), updateMany: vi.fn() },
		projectCheckpoint: {
			findUnique: vi.fn(),
			findUniqueOrThrow: vi.fn(async () => ({ startedAt: null })),
			update: vi.fn(),
		},
	},
}));

vi.mock("@/services/stripe/server", () => ({
	captureCheckout: vi.fn(),
	releaseCheckout: vi.fn(),
	retrieveCheckout: vi.fn(),
}));

const payment = {
	id: "pay_1",
	payableId: "cp1",
	provider: PaymentProvider.PADDLE,
};

const paid = (over: Partial<CheckoutPaid> = {}): CheckoutPaid => ({
	transactionId: "txn_1",
	amount: 2000,
	customerId: "ctm_1",
	invoiceId: "inv_1",
	charged: true,
	held: false,
	...over,
});

beforeEach(() => {
	vi.clearAllMocks();
	vi.stubEnv("PADDLE_API_KEY", "pdl_test");
	vi.mocked(prisma.$transaction).mockImplementation((async (arg: unknown) =>
		typeof arg === "function"
			? (arg as (tx: typeof prisma) => unknown)(prisma)
			: arg) as never);
	vi.mocked(prisma.payment.updateMany).mockResolvedValue({ count: 1 });
	vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue({
		status: CheckpointStatus.Draft,
		curatorKind: CheckpointCuratorKind.AI,
	} as never);
});

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("settling a Paddle checkout", () => {
	it("writes the Paddle references and the charged amount on the PENDING row only", async () => {
		await settleCheckpointCheckout(payment, paid({ amount: 1500 }));

		expect(prisma.payment.updateMany).toHaveBeenCalledWith({
			where: { id: "pay_1", status: PaymentStatus.PENDING },
			data: {
				status: PaymentStatus.PROCESSING,
				providerTransactionId: "txn_1",
				providerCustomerId: "ctm_1",
				providerInvoiceId: "inv_1",
				amount: 1500,
			},
		});
	});

	it("keeps the quoted amount when Paddle's total is unknown", async () => {
		await settleCheckpointCheckout(payment, paid({ amount: null }));

		expect(
			vi.mocked(prisma.payment.updateMany).mock.calls[0][0].data,
		).not.toHaveProperty("amount");
	});

	// Paddle has already taken the money: there is nothing to capture.
	it("completes an AI draft at once without capturing anything", async () => {
		await expect(settleCheckpointCheckout(payment, paid())).resolves.toBe(true);

		expect(captureCheckout).not.toHaveBeenCalled();
		expect(releaseCheckout).not.toHaveBeenCalled();
		expect(prisma.payment.update).toHaveBeenCalledWith({
			where: { id: "pay_1" },
			data: { status: PaymentStatus.COMPLETED, completedAt: expect.any(Date) },
		});
		expect(prisma.projectCheckpoint.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "cp1" },
				data: expect.objectContaining({
					status: CheckpointStatus.Active,
					paymentId: "pay_1",
				}),
			}),
		);
	});

	// A free checkpoint is an admin's grant (GDHUB-40), never a 100% code.
	it("cancels a checkout a code took to zero and starts nothing", async () => {
		await settleCheckpointCheckout(payment, paid({ amount: 0, charged: false }));

		expect(prisma.payment.update).toHaveBeenCalledTimes(1);
		expect(prisma.payment.update).toHaveBeenCalledWith({
			where: { id: "pay_1" },
			data: { status: PaymentStatus.CANCELED },
		});
		expect(prisma.projectCheckpoint.findUnique).not.toHaveBeenCalled();
		expect(prisma.projectCheckpoint.update).not.toHaveBeenCalled();
	});

	// The webhook and the reconciliation may both arrive for the same purchase.
	it("does nothing the second time", async () => {
		vi.mocked(prisma.payment.updateMany).mockResolvedValue({ count: 0 });

		await expect(settleCheckpointCheckout(payment, paid())).resolves.toBe(
			false,
		);
		expect(prisma.payment.update).not.toHaveBeenCalled();
		expect(prisma.projectCheckpoint.update).not.toHaveBeenCalled();
	});
});

describe("reconciling a Paddle checkout the webhook missed", () => {
	const pending = { ...payment, providerTransactionId: "txn_1" };

	it("asks Paddle, not Stripe, and settles what it says is completed", async () => {
		sdk.transactions.get.mockResolvedValue({
			id: "txn_1",
			status: "completed",
			customerId: "ctm_1",
			invoiceId: "inv_1",
			details: { totals: { grandTotal: "2000" }, lineItems: [] },
		});

		await expect(reconcileCheckout(pending)).resolves.toBe(true);

		expect(sdk.transactions.get).toHaveBeenCalledWith("txn_1");
		expect(captureCheckout).not.toHaveBeenCalled();
		expect(prisma.payment.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ status: PaymentStatus.COMPLETED }),
			}),
		);
	});

	it("cancels a PENDING row whose transaction Paddle cancelled", async () => {
		sdk.transactions.get.mockResolvedValue({ id: "txn_1", status: "canceled" });

		await expect(reconcileCheckout(pending)).resolves.toBe(false);

		expect(prisma.payment.updateMany).toHaveBeenCalledWith({
			where: { id: "pay_1", status: PaymentStatus.PENDING },
			data: { status: PaymentStatus.CANCELED },
		});
	});
});
