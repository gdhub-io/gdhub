import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { versionInEffect } from "@/lib/legal/versions";

const authMock = vi.fn();
const createMany = vi.fn();
const paymentCreate = vi.fn();
const createCheckout = vi.fn();
const profileFind = vi.fn();

vi.mock("@/auth", () => ({ auth: () => authMock() }));

// Covered by space-guard.test.ts.
vi.mock("@/lib/space-guard", () => ({
	withSpaceGuard: () => (handler: unknown) => handler,
}));

vi.mock("@/config/checkpoint-pricing", () => ({
	checkpointPurchaseOpen: () => true,
}));

vi.mock("@/repositories/checkpoint-payment", () => ({
	pendingCheckout: async () => null,
	reconcileCheckout: async () => undefined,
	checkpointCheckout: async () => ({
		ok: true,
		amount: 45000,
		currency: "USD",
		name: "Checkpoint",
		description: "",
		checkpoint: { project: { slug: "tide" } },
	}),
}));

vi.mock("@/services/stripe/server", () => ({
	createCheckpointCheckout: (...a: unknown[]) => createCheckout(...a),
	expireCheckout: async () => undefined,
}));

vi.mock("@/services/prisma", () => ({
	prisma: {
		legalAcceptance: { createMany: (...a: unknown[]) => createMany(...a) },
		profile: { findUnique: (...a: unknown[]) => profileFind(...a) },
		payment: {
			updateMany: async () => ({ count: 0 }),
			create: (...a: unknown[]) => paymentCreate(...a),
			update: async () => ({}),
		},
	},
}));

const post = async (body: unknown) => {
	const { POST } = await import("@/app/api/checkpoint/[id]/pay/route");
	const request = new NextRequest("http://localhost/api/checkpoint/cp1/pay", {
		method: "POST",
		headers: {
			"content-type": "application/json",
			"x-forwarded-for": "192.0.2.7",
		},
		body: JSON.stringify(body),
	});
	return (POST as (r: NextRequest, c: unknown) => Promise<Response>)(request, {
		params: Promise.resolve({ id: "cp1" }),
	});
};

const terms = () => ({
	code: "CheckpointPurchaseTerms",
	version: versionInEffect("CheckpointPurchaseTerms")?.version ?? 1,
});

beforeEach(() => {
	vi.clearAllMocks();
	authMock.mockResolvedValue({
		user: { id: "u1", roles: ["Member"], onboardingDone: true },
	});
	paymentCreate.mockResolvedValue({ id: "pay_1" });
	profileFind.mockResolvedValue({ yearOfBirth: 1990 });
	createCheckout.mockResolvedValue({ id: "cs_1", url: "https://pay" });
});

describe("POST /api/checkpoint/[id]/pay", () => {
	// Onboarding admits 16; the checkpoint is sold at 18, so pay checks again.
	it("opens no checkout for a buyer under 18 by year of birth", async () => {
		profileFind.mockResolvedValue({
			yearOfBirth: new Date().getUTCFullYear() - 16,
		});

		const response = await post({ legal: [terms()], startNow: true });

		expect(response.status).toBe(400);
		expect(await response.json()).toMatchObject({ error: "underage" });
		expect(createMany).not.toHaveBeenCalled();
		expect(paymentCreate).not.toHaveBeenCalled();
	});

	it("opens no checkout without the purchase terms accepted", async () => {
		const response = await post({ legal: [], startNow: true });

		expect(response.status).toBe(400);
		expect(await response.json()).toMatchObject({
			details: { reason: "legal.required", code: "CheckpointPurchaseTerms" },
		});
		expect(createMany).not.toHaveBeenCalled();
		expect(paymentCreate).not.toHaveBeenCalled();
	});

	// Without the express request a withdrawal inside 14 days would cost the buyer nothing.
	it("opens no checkout without the request to start at once", async () => {
		const response = await post({ legal: [terms()] });

		expect(response.status).toBe(400);
		expect(createMany).not.toHaveBeenCalled();
		expect(paymentCreate).not.toHaveBeenCalled();
	});

	it("refuses an outdated version of the terms", async () => {
		const response = await post({
			legal: [{ ...terms(), version: terms().version + 1 }],
			startNow: true,
		});

		expect(response.status).toBe(409);
		expect(paymentCreate).not.toHaveBeenCalled();
	});

	it("records the terms with the request to start at once against the checkpoint", async () => {
		const response = await post({ legal: [terms()], startNow: true });

		expect(response.status).toBe(200);
		expect(createMany).toHaveBeenCalledWith({
			data: [
				expect.objectContaining({
					userId: "u1",
					code: "CheckpointPurchaseTerms",
					context: "CheckpointPurchase",
					checkpointId: "cp1",
					ipAddress: "192.0.2.7",
					params: { startNow: "requested" },
				}),
			],
		});
	});
});
