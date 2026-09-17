import {
	CheckpointCuratorKind,
	CheckpointStatus,
	PaymentStatus,
} from "@gdhub-io/gdhub-prisma";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/stripe/webhooks/route";
import { prisma } from "@/services/prisma";
import { stripeEvent } from "@/services/stripe/server";

vi.mock("@/services/prisma", () => ({
	prisma: {
		payment: { findUnique: vi.fn(), update: vi.fn() },
		paymentEvent: { create: vi.fn() },
		projectCheckpoint: { findUnique: vi.fn(), update: vi.fn() },
	},
}));

vi.mock("@/services/stripe/server", () => ({ stripeEvent: vi.fn() }));

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

const payment = { id: "pay_1", payableId: "cp1" };

const draft = (
	curatorKind: CheckpointCuratorKind = CheckpointCuratorKind.Human,
) => ({
	status: CheckpointStatus.Draft,
	curatorKind,
});

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(stripeEvent).mockReturnValue(
		completed({ paymentId: "pay_1", checkpointId: "cp1" }) as never,
	);
	// A rejection set in one test would otherwise survive into the next:
	// clearAllMocks forgets the calls, not the implementation.
	vi.mocked(prisma.paymentEvent.create).mockResolvedValue({} as never);
	vi.mocked(prisma.payment.findUnique).mockResolvedValue(payment as never);
	vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
		draft() as never,
	);
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
		expect(prisma.payment.update).not.toHaveBeenCalled();
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
		expect(prisma.payment.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ status: PaymentStatus.COMPLETED }),
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

	it("does not rewind a checkpoint that already left Draft", async () => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue({
			status: CheckpointStatus.Active,
			curatorKind: CheckpointCuratorKind.Human,
		} as never);

		await post();

		expect(prisma.payment.update).toHaveBeenCalled();
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
