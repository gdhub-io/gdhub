import { CheckpointStatus, PaymentStatus } from "@gdhub-io/gdhub-prisma";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const checkpointFindUnique = vi.fn();
const checkpointUpdate = vi.fn();
const paymentFindFirst = vi.fn();
const paymentUpdate = vi.fn();
const refundCreate = vi.fn();
const transaction = vi.fn();
const refundCheckout = vi.fn();

vi.mock("@/auth", () => ({ auth: () => authMock() }));

// Covered by space-guard.test.ts; mocked so these assertions are about the
// refund rather than about access resolution.
vi.mock("@/lib/space-guard", () => ({
	withSpaceGuard: () => (handler: unknown) => handler,
}));

vi.mock("@/services/prisma", () => ({
	prisma: {
		projectCheckpoint: {
			findUnique: (...a: unknown[]) => checkpointFindUnique(...a),
			update: (...a: unknown[]) => checkpointUpdate(...a),
		},
		payment: {
			findFirst: (...a: unknown[]) => paymentFindFirst(...a),
			update: (...a: unknown[]) => paymentUpdate(...a),
		},
		refund: { create: (...a: unknown[]) => refundCreate(...a) },
		$transaction: (...a: unknown[]) => transaction(...a),
	},
}));

vi.mock("@/services/stripe/server", () => ({
	refundCheckout: (...a: unknown[]) => refundCheckout(...a),
}));

const paid = {
	id: "pay_1",
	amount: 45000,
	currency: "USD",
	providerTransactionId: "cs_1",
};

const post = async () => {
	const { POST } = await import("@/app/api/checkpoint/[id]/cancel/route");
	const request = new NextRequest("http://localhost/api/checkpoint/cp1/cancel", {
		method: "POST",
	});

	return (POST as (r: NextRequest, c: unknown) => Promise<Response>)(request, {
		params: Promise.resolve({ id: "cp1" }),
	});
};

beforeEach(() => {
	vi.clearAllMocks();
	authMock.mockResolvedValue({
		user: { id: "u1", roles: ["Member"], onboardingDone: true },
	});
	checkpointFindUnique.mockResolvedValue({
		status: CheckpointStatus.AwaitingCurator,
	});
	checkpointUpdate.mockResolvedValue({});
	paymentFindFirst.mockResolvedValue(paid);
	refundCheckout.mockResolvedValue({ id: "re_1", amount: 45000, currency: "usd" });
	transaction.mockResolvedValue([]);
});

describe("cancelling a checkpoint", () => {
	it("returns the money and closes it", async () => {
		const response = await post();

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ refunded: true });
		expect(refundCheckout).toHaveBeenCalledWith("cs_1");
		expect(checkpointUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				data: { status: CheckpointStatus.Cancelled },
			}),
		);
	});

	// A row saying REFUNDED that Stripe never agreed to would be a lie in our
	// own records, so the refund is asked for first and written second.
	it("writes nothing down when Stripe refuses the refund", async () => {
		refundCheckout.mockResolvedValue(null);

		expect((await post()).status).toBe(500);
		expect(transaction).not.toHaveBeenCalled();
		expect(checkpointUpdate).not.toHaveBeenCalled();
	});

	it("closes an unpaid draft without going near Stripe", async () => {
		checkpointFindUnique.mockResolvedValue({ status: CheckpointStatus.Draft });
		paymentFindFirst.mockResolvedValue(null);

		await expect((await post()).json()).resolves.toEqual({ refunded: false });
		expect(refundCheckout).not.toHaveBeenCalled();
		expect(checkpointUpdate).toHaveBeenCalled();
	});

	// Once the 28 days run a curator has spent time on them, so what is owed
	// back is a conversation and not a button.
	it("refuses a checkpoint that is already running", async () => {
		checkpointFindUnique.mockResolvedValue({ status: CheckpointStatus.Active });

		const response = await post();

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toMatchObject({
			error: "checkpointRunning",
		});
		expect(refundCheckout).not.toHaveBeenCalled();
	});

	it("only ever refunds a completed payment", async () => {
		await post();

		expect(paymentFindFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ status: PaymentStatus.COMPLETED }),
			}),
		);
	});
});
