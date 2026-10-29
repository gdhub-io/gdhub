import {
	PayableType,
	PaymentProvider,
	PaymentStatus,
} from "@gdhub-io/gdhub-prisma";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { versionInEffect } from "@/lib/legal/versions";

const authMock = vi.fn();
const paymentCreate = vi.fn();
const paymentUpdate = vi.fn();
const pendingCheckout = vi.fn();
const expireCheckout = vi.fn();
const createStripeCheckout = vi.fn();

const sdk = vi.hoisted(() => ({
	transactions: { create: vi.fn(), get: vi.fn(), update: vi.fn() },
}));

vi.mock("@paddle/paddle-node-sdk", async (importOriginal) => ({
	...(await importOriginal<typeof import("@paddle/paddle-node-sdk")>()),
	Paddle: class {
		transactions = sdk.transactions;
	},
}));

vi.mock("@/auth", () => ({ auth: () => authMock() }));

// Covered by space-guard.test.ts.
vi.mock("@/lib/space-guard", () => ({
	withSpaceGuard: () => (handler: unknown) => handler,
}));

vi.mock("@/config/checkpoint-pricing", () => ({
	checkpointPurchaseOpen: () => true,
}));

vi.mock("@/repositories/checkpoints/payment", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/repositories/checkpoints/payment")>()),
	pendingCheckout: (...a: unknown[]) => pendingCheckout(...a),
	checkpointCheckout: async () => ({
		ok: true,
		amount: 2000,
		currency: "USD",
		name: "Checkpoint",
		description: "",
		checkpoint: { project: { slug: "tide" } },
	}),
}));

vi.mock("@/services/checkpoints/flows/payment", () => ({
	reconcileCheckout: async () => false,
}));

vi.mock("@/services/stripe/server", () => ({
	createCheckpointCheckout: (...a: unknown[]) => createStripeCheckout(...a),
	expireCheckout: (...a: unknown[]) => expireCheckout(...a),
}));

vi.mock("@/services/prisma", () => ({
	prisma: {
		legalAcceptance: { createMany: async () => ({ count: 1 }) },
		profile: { findUnique: async () => ({ yearOfBirth: 1990 }) },
		payment: {
			updateMany: async () => ({ count: 0 }),
			create: (...a: unknown[]) => paymentCreate(...a),
			update: (...a: unknown[]) => paymentUpdate(...a),
		},
	},
}));

const post = async () => {
	const { POST } = await import("@/app/api/checkpoint/[id]/pay/route");
	const request = new NextRequest("http://localhost/api/checkpoint/cp1/pay", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			legal: [
				{
					code: "CheckpointPurchaseTerms",
					version: versionInEffect("CheckpointPurchaseTerms")?.version ?? 1,
				},
			],
			startNow: true,
		}),
	});
	return (POST as (r: NextRequest, c: unknown) => Promise<Response>)(request, {
		params: Promise.resolve({ id: "cp1" }),
	});
};

beforeEach(() => {
	vi.clearAllMocks();
	vi.stubEnv("PADDLE_API_KEY", "pdl_test");
	vi.stubEnv("PADDLE_AI_CHECKPOINT_PRICE_ID", "pri_ai");
	vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://gdhub.io");
	authMock.mockResolvedValue({
		user: {
			id: "u1",
			email: "a@x.io",
			roles: ["Member"],
			onboardingDone: true,
		},
	});
	pendingCheckout.mockResolvedValue(null);
	paymentCreate.mockResolvedValue({ id: "pay_1" });
	sdk.transactions.create.mockResolvedValue({ id: "txn_1" });
	sdk.transactions.update.mockResolvedValue({});
});

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("paying for a checkpoint through Paddle, the default", () => {
	it("hands back the transaction for the overlay instead of a URL", async () => {
		const response = await post();

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body).toEqual({
			paddleTransactionId: "txn_1",
			customerEmail: "a@x.io",
			successUrl: expect.stringMatching(/^https:\/\/gdhub\.io\//),
		});
		expect(body).not.toHaveProperty("url");
		expect(createStripeCheckout).not.toHaveBeenCalled();
	});

	it("writes the payment as Paddle's and links the transaction to it", async () => {
		await post();

		expect(paymentCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					provider: PaymentProvider.PADDLE,
					status: PaymentStatus.PENDING,
					payableType: PayableType.CHECKPOINT,
					payableId: "cp1",
					payerId: "u1",
					amount: 2000,
				}),
			}),
		);
		expect(sdk.transactions.create).toHaveBeenCalledWith(
			expect.objectContaining({
				customData: { paymentId: "pay_1", checkpointId: "cp1" },
			}),
		);
		expect(paymentUpdate).toHaveBeenCalledWith({
			where: { id: "pay_1" },
			data: { providerTransactionId: "txn_1" },
		});
	});

	// An earlier attempt is closed where it was opened, not at today's provider.
	it("closes an earlier Stripe checkout at Stripe", async () => {
		pendingCheckout.mockResolvedValue({
			id: "pay_0",
			payableId: "cp1",
			provider: PaymentProvider.STRIPE,
			providerTransactionId: "cs_0",
		});

		await post();

		expect(expireCheckout).toHaveBeenCalledWith("cs_0");
		expect(sdk.transactions.update).not.toHaveBeenCalled();
	});

	it("closes an earlier Paddle checkout at Paddle", async () => {
		pendingCheckout.mockResolvedValue({
			id: "pay_0",
			payableId: "cp1",
			provider: PaymentProvider.PADDLE,
			providerTransactionId: "txn_0",
		});

		await post();

		expect(sdk.transactions.update).toHaveBeenCalledWith("txn_0", {
			status: "canceled",
		});
		expect(expireCheckout).not.toHaveBeenCalled();
	});
});
