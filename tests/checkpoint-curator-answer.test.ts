import { CheckpointStatus, PaymentStatus } from "@gdhub-io/gdhub-prisma";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const checkpointFindUnique = vi.fn();
const checkpointUpdate = vi.fn();
const paymentFindFirst = vi.fn();
const paymentUpdate = vi.fn();
const captureCheckout = vi.fn();
const releaseCheckout = vi.fn();

vi.mock("@/auth", () => ({ auth: () => authMock() }));

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
	},
}));

vi.mock("@/services/stripe/server", () => ({
	captureCheckout: (...a: unknown[]) => captureCheckout(...a),
	releaseCheckout: (...a: unknown[]) => releaseCheckout(...a),
}));

const curator = { id: "u9", roles: ["Member"], onboardingDone: true };

const answer = async (accept: boolean) => {
	const { POST } = await import("@/app/api/checkpoint/[id]/curator/route");
	const request = new NextRequest("http://localhost/api/checkpoint/cp1/curator", {
		method: "POST",
		body: JSON.stringify({ accept }),
		headers: { "content-type": "application/json" },
	});

	return (POST as (r: NextRequest, c: unknown) => Promise<Response>)(request, {
		params: Promise.resolve({ id: "cp1" }),
	});
};

beforeEach(() => {
	vi.clearAllMocks();
	authMock.mockResolvedValue({ user: curator });
	checkpointFindUnique.mockResolvedValue({
		status: CheckpointStatus.AwaitingCurator,
		curatorId: "u9",
		startedAt: new Date("2026-09-20T00:00:00.000Z"),
	});
	checkpointUpdate.mockResolvedValue({});
	paymentFindFirst.mockResolvedValue({
		id: "pay_1",
		providerTransactionId: "cs_1",
	});
	paymentUpdate.mockResolvedValue({});
	captureCheckout.mockResolvedValue({ id: "pi_1", status: "succeeded" });
	releaseCheckout.mockResolvedValue({ id: "pi_1", status: "canceled" });
});

describe("a curator answering", () => {
	// Accepting is the moment the author is actually charged: buying the
	// checkpoint only held the money on their card.
	it("takes the held money and starts the 28 days", async () => {
		expect((await answer(true)).status).toBe(200);

		expect(captureCheckout).toHaveBeenCalledWith("cs_1");
		expect(paymentUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ status: PaymentStatus.COMPLETED }),
			}),
		);
		expect(checkpointUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ status: CheckpointStatus.Active }),
			}),
		);
	});

	it("lets the hold go when they turn it down, with nothing to refund", async () => {
		await answer(false);

		expect(releaseCheckout).toHaveBeenCalledWith("cs_1");
		expect(captureCheckout).not.toHaveBeenCalled();
		expect(paymentUpdate).toHaveBeenCalledWith(
			expect.objectContaining({ data: { status: PaymentStatus.CANCELED } }),
		);
		expect(checkpointUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					status: CheckpointStatus.Draft,
					curatorId: null,
					// Remembered, so the picker can grey them out rather than losing
					// them — a row that disappears is one the author picks again.
					declinedCuratorIds: { push: "u9" },
				}),
			}),
		);
	});

	// The checkpoint must not start on a capture that failed: the 28 days would
	// be running against money nobody has.
	it("starts nothing when the money cannot be taken", async () => {
		captureCheckout.mockResolvedValue(null);

		expect((await answer(true)).status).toBe(500);
		expect(checkpointUpdate).not.toHaveBeenCalled();
	});

	it("is refused to anyone who is not the curator named on it", async () => {
		authMock.mockResolvedValue({ user: { ...curator, id: "someone-else" } });

		expect((await answer(true)).status).toBe(403);
		expect(captureCheckout).not.toHaveBeenCalled();
	});

	it("does not answer a checkpoint that is not waiting", async () => {
		checkpointFindUnique.mockResolvedValue({
			status: CheckpointStatus.Active,
			curatorId: "u9",
			startedAt: null,
		});

		expect((await answer(true)).status).toBe(400);
		expect(captureCheckout).not.toHaveBeenCalled();
	});
});
