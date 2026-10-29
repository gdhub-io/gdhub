import {
	CheckpointCuratorKind,
	CheckpointStatus,
	PaymentProvider,
	PaymentStatus,
} from "@gdhub-io/gdhub-prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { reconcileCheckout } from "@/repositories/checkpoint-payment";
import { prisma } from "@/services/prisma";
import { retrieveCheckout } from "@/services/stripe/server";

vi.mock("@/repositories/advisor-availability", () => ({
	isFirstCallFree: vi.fn(async () => true),
	bookSessions: vi.fn(async () => undefined),
	SlotTakenError: class SlotTakenError extends Error {},
}));

vi.mock("@/services/prisma", () => ({
	prisma: {
		$transaction: vi.fn(),
		checkpointSession: { deleteMany: vi.fn() },
		payment: { updateMany: vi.fn() },
		projectCheckpoint: {
			findUnique: vi.fn(),
			update: vi.fn(),
			updateMany: vi.fn(),
		},
	},
}));

vi.mock("@/services/stripe/server", () => ({
	retrieveCheckout: vi.fn(),
	refundCheckout: vi.fn(),
	releaseCheckout: vi.fn(),
}));

const pending = {
	id: "pay_1",
	payableId: "cp1",
	provider: PaymentProvider.STRIPE,
	providerTransactionId: "cs_1",
};

const session = (status: string) =>
	({ id: "cs_1", status, customer: null, payment_intent: "pi_1" }) as never;

beforeEach(() => {
	vi.mocked(prisma.$transaction).mockImplementation((async (arg: unknown) =>
		typeof arg === "function"
			? (arg as (tx: typeof prisma) => unknown)(prisma)
			: Promise.all(arg as unknown[])) as never);
	vi.clearAllMocks();
	vi.mocked(prisma.payment.updateMany).mockResolvedValue({ count: 1 });
	vi.mocked(prisma.projectCheckpoint.updateMany).mockResolvedValue({ count: 1 });
	vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue({
		status: CheckpointStatus.Draft,
		curatorKind: CheckpointCuratorKind.Human,
	} as never);
});

// The webhook is not the only way a purchase becomes known: when it never
// arrives, Stripe is asked, and its answer is applied the same way.
describe("reconciling a checkout the webhook missed", () => {
	it("applies a checkout Stripe says is complete", async () => {
		vi.mocked(retrieveCheckout).mockResolvedValue(session("complete"));

		expect(await reconcileCheckout(pending)).toBe(true);
		expect(prisma.projectCheckpoint.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "cp1", status: { in: [CheckpointStatus.Draft] } },
				data: {
					status: CheckpointStatus.AwaitingCurator,
					paymentId: "pay_1",
				},
			}),
		);
	});

	it("starts nothing while the checkout is still open", async () => {
		vi.mocked(retrieveCheckout).mockResolvedValue(session("open"));

		expect(await reconcileCheckout(pending)).toBe(false);
		expect(prisma.payment.updateMany).not.toHaveBeenCalled();
		expect(prisma.projectCheckpoint.updateMany).not.toHaveBeenCalled();
	});

	it("closes the row of a checkout that expired unpaid", async () => {
		vi.mocked(retrieveCheckout).mockResolvedValue(session("expired"));

		await reconcileCheckout(pending);

		expect(prisma.payment.updateMany).toHaveBeenCalledWith({
			where: { id: "pay_1", status: PaymentStatus.PENDING },
			data: { status: PaymentStatus.CANCELED },
		});
		expect(prisma.projectCheckpoint.updateMany).not.toHaveBeenCalled();
	});

	it("leaves it alone when the webhook got there first", async () => {
		vi.mocked(retrieveCheckout).mockResolvedValue(session("complete"));
		vi.mocked(prisma.payment.updateMany).mockResolvedValue({ count: 0 });

		expect(await reconcileCheckout(pending)).toBe(false);
		expect(prisma.projectCheckpoint.updateMany).not.toHaveBeenCalled();
	});
});
