import { CheckpointStatus, PaymentStatus } from "@gdhub-io/gdhub-prisma";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const checkpointFindUnique = vi.fn();
const checkpointUpdate = vi.fn();
const checkpointDelete = vi.fn();
const paymentFindFirst = vi.fn();
const paymentUpdate = vi.fn();
const refundCreate = vi.fn();
const transaction = vi.fn();
const refundCheckout = vi.fn();
const releaseCheckout = vi.fn();

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
			delete: (...a: unknown[]) => checkpointDelete(...a),
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
	releaseCheckout: (...a: unknown[]) => releaseCheckout(...a),
}));

const charged = {
	id: "pay_1",
	amount: 45000,
	currency: "USD",
	status: PaymentStatus.COMPLETED,
	providerTransactionId: "cs_1",
};

const held = { ...charged, status: PaymentStatus.PROCESSING };

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
	checkpointDelete.mockResolvedValue({});
	paymentFindFirst.mockResolvedValue(charged);
	refundCheckout.mockResolvedValue({ id: "re_1", amount: 45000, currency: "usd" });
	releaseCheckout.mockResolvedValue({ id: "pi_1", status: "canceled" });
	transaction.mockResolvedValue([]);
});

describe("cancelling a checkpoint", () => {
	it("returns the money and closes it", async () => {
		const response = await post();

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({
			refunded: true,
			released: false,
		});
		expect(refundCheckout).toHaveBeenCalledWith("cs_1");
		// Deleted rather than kept as Cancelled: it never ran, and a row saying a
		// purchase was undone is noise in the project's history.
		expect(checkpointDelete).toHaveBeenCalledWith({ where: { id: "cp1" } });
	});

	// A row saying REFUNDED that Stripe never agreed to would be a lie in our
	// own records, so the refund is asked for first and written second.
	it("writes nothing down when Stripe refuses the refund", async () => {
		refundCheckout.mockResolvedValue(null);

		expect((await post()).status).toBe(500);
		expect(transaction).not.toHaveBeenCalled();
		expect(checkpointDelete).not.toHaveBeenCalled();
	});

	it("closes an unpaid draft without going near Stripe", async () => {
		checkpointFindUnique.mockResolvedValue({ status: CheckpointStatus.Draft });
		paymentFindFirst.mockResolvedValue(null);

		await expect((await post()).json()).resolves.toEqual({
			refunded: false,
			released: false,
		});
		expect(refundCheckout).not.toHaveBeenCalled();
		expect(checkpointDelete).toHaveBeenCalled();
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

	// Before a curator accepts, the money is only held. Letting a hold go costs
	// nothing and leaves no refund to explain — which is the whole reason the
	// card is authorised rather than charged.
	it("releases the hold instead of refunding when nothing was charged", async () => {
		paymentFindFirst.mockResolvedValue(held);

		await expect((await post()).json()).resolves.toEqual({
			refunded: false,
			released: true,
		});
		expect(releaseCheckout).toHaveBeenCalledWith("cs_1");
		expect(refundCheckout).not.toHaveBeenCalled();
		expect(paymentUpdate).toHaveBeenCalledWith(
			expect.objectContaining({ data: { status: PaymentStatus.CANCELED } }),
		);
	});

	it("keeps the checkpoint when the hold cannot be let go", async () => {
		paymentFindFirst.mockResolvedValue(held);
		releaseCheckout.mockResolvedValue(null);

		expect((await post()).status).toBe(500);
		expect(checkpointDelete).not.toHaveBeenCalled();
	});

	it("looks only at money that is held or charged", async () => {
		await post();

		expect(paymentFindFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					status: {
						in: [PaymentStatus.PROCESSING, PaymentStatus.COMPLETED],
					},
				}),
			}),
		);
	});
});
