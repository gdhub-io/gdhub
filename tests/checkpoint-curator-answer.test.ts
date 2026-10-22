import { CheckpointStatus, PaymentStatus } from "@gdhub-io/gdhub-prisma";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { versionInEffect } from "@/lib/legal/versions";
import { prisma } from "@/services/prisma";
import { publishForTest } from "./helpers/legal";

// Unpublished until paid advising has a seller (GDHUB-108); its rules still hold.
publishForTest("AdvisorAgreement");

const authMock = vi.fn();
const checkpointFindUnique = vi.fn();
const checkpointUpdate = vi.fn();
const paymentFindFirst = vi.fn();
const paymentUpdate = vi.fn();
const captureCheckout = vi.fn();
const returnMoney = vi.fn();
const createMany = vi.fn();
const lastAcceptance = vi.fn();

vi.mock("@/auth", () => ({ auth: () => authMock() }));

const notifyAuthor = vi.fn();
vi.mock("@/services/checkpoint-notifications", () => ({
	notifyAuthorOfAnswer: (...a: unknown[]) => notifyAuthor(...a),
}));

vi.mock("@/repositories/advisor-availability", () => ({
	isFirstCallFree: vi.fn(async () => true),
	bookSessions: vi.fn(async () => undefined),
	SlotTakenError: class SlotTakenError extends Error {},
}));

vi.mock("@/services/prisma", () => ({
	prisma: {
		$transaction: vi.fn(),
		checkpointSession: { deleteMany: vi.fn() },
		projectCheckpoint: {
			findUnique: (...a: unknown[]) => checkpointFindUnique(...a),
			update: (...a: unknown[]) => checkpointUpdate(...a),
		},
		legalAcceptance: {
			createMany: (...a: unknown[]) => createMany(...a),
			findFirst: (...a: unknown[]) => lastAcceptance(...a),
		},
		payment: {
			findFirst: (...a: unknown[]) => paymentFindFirst(...a),
			update: (...a: unknown[]) => paymentUpdate(...a),
		},
	},
}));

vi.mock("@/services/stripe/server", () => ({
	captureCheckout: (...a: unknown[]) => captureCheckout(...a),
}));

vi.mock("@/repositories/checkpoint-payment", async (importOriginal) => ({
	...(await importOriginal<object>()),
	returnCheckpointMoney: (...a: unknown[]) => returnMoney(...a),
}));

const curator = { id: "u9", roles: ["Member"], onboardingDone: true };

const terms = [
	{
		code: "AdvisorAgreement",
		version: versionInEffect("AdvisorAgreement")?.version ?? 1,
	},
];

const answer = async (
	accept: boolean,
	legal: unknown = accept ? terms : undefined,
) => {
	const { POST } = await import("@/app/api/checkpoint/[id]/curator/route");
	const request = new NextRequest("http://localhost/api/checkpoint/cp1/curator", {
		method: "POST",
		body: JSON.stringify({ accept, legal }),
		headers: { "content-type": "application/json" },
	});

	return (POST as (r: NextRequest, c: unknown) => Promise<Response>)(request, {
		params: Promise.resolve({ id: "cp1" }),
	});
};

beforeEach(() => {
	vi.mocked(prisma.$transaction).mockImplementation((async (arg: unknown) =>
		typeof arg === "function"
			? (arg as (tx: typeof prisma) => unknown)(prisma)
			: Promise.all(arg as unknown[])) as never);
	vi.clearAllMocks();
	authMock.mockResolvedValue({ user: curator });
	lastAcceptance.mockResolvedValue(null);
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
	returnMoney.mockResolvedValue({ released: true, refunded: false });
});

describe("a curator answering", () => {
	// Accepting is the moment the author is actually charged: buying the
	// checkpoint only held the money on their card.
	it("takes nothing on without the Advisor Agreement accepted", async () => {
		const response = await answer(true, []);

		expect(response.status).toBe(400);
		expect(await response.json()).toMatchObject({
			details: { reason: "legal.required", code: "AdvisorAgreement" },
		});
		expect(captureCheckout).not.toHaveBeenCalled();
		expect(checkpointUpdate).not.toHaveBeenCalled();
	});

	it("records the terms with the checkpoint they were accepted for", async () => {
		await answer(true);

		expect(createMany).toHaveBeenCalledWith({
			data: [
				expect.objectContaining({
					userId: "u9",
					code: "AdvisorAgreement",
					context: "CuratorAccept",
					checkpointId: "cp1",
				}),
			],
		});
	});

	it("does not ask a curator who already accepted them", async () => {
		lastAcceptance.mockResolvedValue({
			version: terms[0].version,
			acceptedAt: new Date(),
		});

		expect((await answer(true, undefined)).status).toBe(200);
		expect(createMany).not.toHaveBeenCalled();
	});

	it("takes the held money and starts the 28 days", async () => {
		expect((await answer(true)).status).toBe(200);
		expect(notifyAuthor).toHaveBeenCalledWith("cp1", expect.any(String), "accepted");

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

	// Held or already captured, the author gets it back the right way — the
	// repository decides which, and the answer waits for it either way.
	it("gives the money back when they turn it down", async () => {
		await answer(false);

		expect(returnMoney).toHaveBeenCalledWith("cp1", "curatorDeclined");
		expect(notifyAuthor).toHaveBeenCalledWith("cp1", expect.any(String), "declined");
		expect(captureCheckout).not.toHaveBeenCalled();
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

	// A decline that could not return the money would leave the author paying
	// for a checkpoint nobody runs.
	it("refuses the decline when the money cannot be given back", async () => {
		returnMoney.mockResolvedValue(null);

		expect((await answer(false)).status).toBe(500);
		expect(checkpointUpdate).not.toHaveBeenCalled();
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
