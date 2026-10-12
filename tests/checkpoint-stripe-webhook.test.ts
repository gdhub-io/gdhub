import {
	CheckpointCuratorKind,
	CheckpointStatus,
	PaymentStatus,
} from "@gdhub-io/gdhub-prisma";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/stripe/webhooks/route";
import {
	bookSessions,
	SlotTakenError,
} from "@/repositories/advisor-availability";
import { prisma } from "@/services/prisma";
import {
	captureCheckout,
	releaseCheckout,
	sessionOfPaymentIntent,
	stripeEvent,
} from "@/services/stripe/server";

vi.mock("@/repositories/advisor-availability", () => ({
	isFirstCallFree: vi.fn(async () => true),
	bookSessions: vi.fn(async () => undefined),
	SlotTakenError: class SlotTakenError extends Error {},
}));

vi.mock("@/services/prisma", () => ({
	prisma: {
		$transaction: vi.fn(),
		checkpointSession: { deleteMany: vi.fn() },
		payment: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
		paymentEvent: { create: vi.fn() },
		projectCheckpoint: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
		refund: { upsert: vi.fn() },
	},
}));

vi.mock("@/services/stripe/server", () => ({
	stripeEvent: vi.fn(),
	sessionOfPaymentIntent: vi.fn(),
	retrieveCheckout: vi.fn(),
	refundCheckout: vi.fn(),
	releaseCheckout: vi.fn(),
	captureCheckout: vi.fn(),
}));

const post = () =>
	POST(
		new Request("https://gdhub.io/api/stripe/webhooks", {
			method: "POST",
			body: "{}",
			headers: { "stripe-signature": "t=1,v1=whatever" },
		}) as unknown as NextRequest,
	);

const completed = (metadata: Record<string, string>) => ({
	id: "evt_1",
	type: "checkout.session.completed",
	data: { object: { id: "cs_1", metadata, customer: "cus_1" } },
});

const payment = {
	id: "pay_1",
	payableId: "cp1",
	amount: 45000,
	currency: "USD",
};

const refunded = (over: Record<string, unknown> = {}) => ({
	id: "evt_2",
	type: "charge.refunded",
	data: {
		object: {
			payment_intent: "pi_1",
			amount: 45000,
			amount_refunded: 45000,
			refunds: {
				data: [{ id: "re_1", amount: 45000, currency: "usd", reason: null }],
			},
			...over,
		},
	},
});

const draft = (
	curatorKind: CheckpointCuratorKind = CheckpointCuratorKind.Human,
) => ({
	status: CheckpointStatus.Draft,
	curatorKind,
});

beforeEach(() => {
	vi.mocked(prisma.$transaction).mockImplementation((async (arg: unknown) =>
		typeof arg === "function"
			? (arg as (tx: typeof prisma) => unknown)(prisma)
			: Promise.all(arg as unknown[])) as never);
	vi.clearAllMocks();
	vi.mocked(stripeEvent).mockReturnValue(
		completed({ paymentId: "pay_1", checkpointId: "cp1" }) as never,
	);
	// A rejection set in one test would otherwise survive into the next:
	// clearAllMocks forgets the calls, not the implementation.
	vi.mocked(prisma.paymentEvent.create).mockResolvedValue({} as never);
	vi.mocked(prisma.payment.findUnique).mockResolvedValue(payment as never);
	vi.mocked(prisma.payment.updateMany).mockResolvedValue({ count: 1 });
	vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
		draft() as never,
	);
	vi.mocked(sessionOfPaymentIntent).mockResolvedValue("cs_1");
	vi.mocked(captureCheckout).mockResolvedValue({ id: "pi_1" } as never);
	vi.mocked(releaseCheckout).mockResolvedValue({ id: "pi_1" } as never);
});

describe("the Stripe webhook", () => {
	it("refuses anything it cannot verify, and reads nothing of it", async () => {
		vi.mocked(stripeEvent).mockReturnValue(null);

		expect((await post()).status).toBe(401);
		expect(prisma.paymentEvent.create).not.toHaveBeenCalled();
		expect(prisma.projectCheckpoint.update).not.toHaveBeenCalled();
	});

	// Stripe retries, and a retry must not start a second run of the 28 days.
	// The unique event id is the guard, and it is checked before any write.
	it("starts one checkpoint when the same event lands twice", async () => {
		vi.mocked(prisma.paymentEvent.create).mockRejectedValue({ code: "P2002" });

		expect((await post()).status).toBe(200);
		expect(prisma.payment.updateMany).not.toHaveBeenCalled();
		expect(prisma.projectCheckpoint.update).not.toHaveBeenCalled();
	});

	it("hands a checkpoint to its curator rather than starting it", async () => {
		await post();

		expect(prisma.projectCheckpoint.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					status: CheckpointStatus.AwaitingCurator,
					paymentId: "pay_1",
				}),
			}),
		);
		// Authorised, not charged: the money is taken when a curator accepts.
		expect(prisma.payment.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "pay_1", status: PaymentStatus.PENDING },
				data: expect.objectContaining({ status: PaymentStatus.PROCESSING }),
			}),
		);
	});

	// Someone booked the hour while this author was paying: nothing is held for
	// a series that cannot run, and the draft asks for another time.
	it("lets the hold go when the first call was taken meanwhile", async () => {
		vi.mocked(bookSessions).mockRejectedValueOnce(new SlotTakenError());
		vi.mocked(releaseCheckout).mockResolvedValue({} as never);

		await post();

		expect(releaseCheckout).toHaveBeenCalledWith("cs_1");
		expect(prisma.payment.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: { status: PaymentStatus.CANCELED },
			}),
		);
		expect(prisma.projectCheckpoint.update).toHaveBeenCalledWith(
			expect.objectContaining({ data: { startedAt: null, dueAt: null } }),
		);
		expect(prisma.projectCheckpoint.update).not.toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					status: CheckpointStatus.AwaitingCurator,
				}),
			}),
		);
	});

	it("starts the 28 days at once when the AI curator runs them", async () => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
			draft(CheckpointCuratorKind.AI) as never,
		);

		await post();

		expect(prisma.projectCheckpoint.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ status: CheckpointStatus.Active }),
			}),
		);
	});

	// Nobody accepts for the AI curator, so a hold left as it is would be let go
	// by the holds cron and the 28 days would run unpaid.
	it("charges at once when the AI curator runs them", async () => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
			draft(CheckpointCuratorKind.AI) as never,
		);

		await post();

		expect(captureCheckout).toHaveBeenCalledWith("cs_1");
		expect(prisma.payment.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "pay_1" },
				data: expect.objectContaining({ status: PaymentStatus.COMPLETED }),
			}),
		);
	});

	it("starts nothing and lets the hold go when the AI charge is refused", async () => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
			draft(CheckpointCuratorKind.AI) as never,
		);
		vi.mocked(captureCheckout).mockResolvedValue(null);

		await post();

		expect(releaseCheckout).toHaveBeenCalledWith("cs_1");
		expect(prisma.payment.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: { status: PaymentStatus.CANCELED },
			}),
		);
		expect(prisma.projectCheckpoint.update).not.toHaveBeenCalled();
	});

	it("leaves a human curator's hold uncharged until they accept", async () => {
		await post();

		expect(captureCheckout).not.toHaveBeenCalled();
	});

	it("does not rewind a checkpoint that already left Draft", async () => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue({
			status: CheckpointStatus.Active,
			curatorKind: CheckpointCuratorKind.Human,
		} as never);

		await post();

		expect(prisma.payment.updateMany).toHaveBeenCalled();
		expect(prisma.projectCheckpoint.update).not.toHaveBeenCalled();
	});

	// The reconciliation may have applied it first, or the curator declined and
	// the hold was released: a late delivery must not bring either back.
	it("does nothing when the payment is no longer waiting", async () => {
		vi.mocked(prisma.payment.updateMany).mockResolvedValue({ count: 0 });

		await post();

		expect(prisma.projectCheckpoint.findUnique).not.toHaveBeenCalled();
		expect(prisma.projectCheckpoint.update).not.toHaveBeenCalled();
	});

	// A session whose metadata names someone else's checkpoint must not start it.
	it("ignores an event whose payment is for another checkpoint", async () => {
		vi.mocked(stripeEvent).mockReturnValue(
			completed({ paymentId: "pay_1", checkpointId: "cp2" }) as never,
		);

		await post();

		expect(prisma.projectCheckpoint.update).not.toHaveBeenCalled();
	});
});

// Our own cancel route writes its refund as it makes it. This is for the ones
// it did not make — money returned from the Stripe dashboard, which used to
// leave the payment reading COMPLETED and the checkpoint alive.
describe("a refund made outside the app", () => {
	it("marks the payment returned and closes a checkpoint that never started", async () => {
		vi.mocked(stripeEvent).mockReturnValue(refunded() as never);

		expect((await post()).status).toBe(200);
		expect(sessionOfPaymentIntent).toHaveBeenCalledWith("pi_1");
		expect(prisma.payment.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: { status: PaymentStatus.REFUNDED },
			}),
		);
		expect(prisma.projectCheckpoint.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				data: { status: CheckpointStatus.Cancelled },
			}),
		);
	});

	it("writes the refund under Stripe's id, so our own row is not doubled", async () => {
		vi.mocked(stripeEvent).mockReturnValue(refunded() as never);

		await post();

		expect(prisma.refund.upsert).toHaveBeenCalledWith(
			expect.objectContaining({ where: { providerRefundId: "re_1" } }),
		);
	});

	it("leaves the checkpoint alone when only part of the money went back", async () => {
		vi.mocked(stripeEvent).mockReturnValue(
			refunded({ amount_refunded: 10000 }) as never,
		);

		await post();

		expect(prisma.payment.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: { status: PaymentStatus.PARTIALLY_REFUNDED },
			}),
		);
		expect(prisma.projectCheckpoint.updateMany).not.toHaveBeenCalled();
	});

	it("ignores a charge it cannot trace back to a payment", async () => {
		vi.mocked(stripeEvent).mockReturnValue(refunded() as never);
		vi.mocked(sessionOfPaymentIntent).mockResolvedValue(null as never);

		await post();

		expect(prisma.payment.update).not.toHaveBeenCalled();
		expect(prisma.refund.upsert).not.toHaveBeenCalled();
	});
});
