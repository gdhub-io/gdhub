import { AuditAction } from "@gdhub-io/gdhub-prisma";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const auditCreate = vi.fn();
const couponsCreate = vi.fn();
const couponsDel = vi.fn();
const promoCreate = vi.fn();
const promoUpdate = vi.fn();
const promoList = vi.fn();

vi.mock("@/auth", () => ({ auth: () => authMock() }));

// Covered by space-guard.test.ts; mocked so these assertions are about the codes.
vi.mock("@/lib/space-guard", () => ({
	withSpaceGuard: () => (handler: unknown) => handler,
}));

// These assertions are about the Stripe path; the Paddle one has its own tests.
vi.mock("@/config/checkpoint", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/config/checkpoint")>()),
	CHECKPOINT_PAYMENT_PROVIDER: "STRIPE",
}));

vi.mock("@/services/prisma", () => ({
	prisma: { auditLog: { create: (...a: unknown[]) => auditCreate(...a) } },
}));

vi.mock("@/services/stripe/server", () => ({
	stripe: () => ({
		coupons: {
			create: (...a: unknown[]) => couponsCreate(...a),
			del: (...a: unknown[]) => couponsDel(...a),
		},
		promotionCodes: {
			create: (...a: unknown[]) => promoCreate(...a),
			update: (...a: unknown[]) => promoUpdate(...a),
			list: (...a: unknown[]) => promoList(...a),
		},
	}),
}));

const stripePromo = (over: Record<string, unknown> = {}) => ({
	id: "promo_1",
	code: "LAUNCH",
	active: true,
	expires_at: null,
	max_redemptions: null,
	times_redeemed: 0,
	restrictions: { first_time_transaction: false },
	promotion: {
		type: "coupon",
		coupon: { id: "co_1", percent_off: null, amount_off: 5000 },
	},
	...over,
});

const request = (url: string, method: string, body: unknown) =>
	new NextRequest(url, {
		method,
		body: JSON.stringify(body),
		headers: { "content-type": "application/json" },
	});

const create = async (body: Record<string, unknown>) => {
	const { POST } = await import("@/app/api/admin/checkpoints/promo-codes/route");

	return (POST as (r: NextRequest, c: unknown) => Promise<Response>)(
		request("http://localhost/api/admin/checkpoints/promo-codes", "POST", body),
		{ params: Promise.resolve({}) },
	);
};

const patch = async (body: unknown) => {
	const { PATCH } = await import(
		"@/app/api/admin/checkpoints/promo-codes/[id]/route"
	);

	return (PATCH as (r: NextRequest, c: unknown) => Promise<Response>)(
		request(
			"http://localhost/api/admin/checkpoints/promo-codes/promo_1",
			"PATCH",
			body,
		),
		{ params: Promise.resolve({ id: "promo_1" }) },
	);
};

const amountCode = {
	code: " launch ",
	kind: "amount",
	value: 50,
	firstPurchaseOnly: false,
};

beforeEach(() => {
	vi.clearAllMocks();
	authMock.mockResolvedValue({
		user: { id: "admin1", roles: ["Member"], onboardingDone: true },
	});
	auditCreate.mockResolvedValue({});
	couponsCreate.mockResolvedValue({ id: "co_1" });
	couponsDel.mockResolvedValue({});
	promoCreate.mockResolvedValue(stripePromo());
	promoUpdate.mockResolvedValue(stripePromo({ active: false }));
});

describe("listing promotion codes", () => {
	it("answers with the codes and whether first-purchase codes exist", async () => {
		promoList.mockResolvedValue({ data: [stripePromo()] });
		const { GET } = await import("@/app/api/admin/checkpoints/promo-codes/route");

		const response = await (
			GET as (r: NextRequest, c: unknown) => Promise<Response>
		)(new NextRequest("http://localhost/api/admin/checkpoints/promo-codes"), {
			params: Promise.resolve({}),
		});

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			codes: [expect.objectContaining({ id: "promo_1", amountOff: 5000 })],
			firstPurchase: true,
		});
	});
});

describe("creating a promotion code", () => {
	// A free checkpoint is an admin's grant (GDHUB-40), never a code.
	it("refuses 100% off", async () => {
		const response = await create({
			code: "FREE",
			kind: "percent",
			value: 100,
			firstPurchaseOnly: false,
		});

		expect(response.status).toBe(400);
		expect(couponsCreate).not.toHaveBeenCalled();
	});

	it("refuses an expiry in the past", async () => {
		const response = await create({
			...amountCode,
			expiresAt: "2020-01-01T00:00:00.000Z",
		});

		expect(response.status).toBe(400);
		expect(couponsCreate).not.toHaveBeenCalled();
	});

	// Without the minimum, a $50 code on a $50 checkpoint would leave nothing to
	// hold, and the payment would read as failed.
	it("never lets an amount code take a checkpoint to zero", async () => {
		const response = await create(amountCode);

		expect(response.status).toBe(200);
		expect(couponsCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				duration: "once",
				amount_off: 5000,
				currency: "usd",
			}),
		);
		expect(promoCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				code: "LAUNCH",
				promotion: { type: "coupon", coupon: "co_1" },
				restrictions: {
					first_time_transaction: false,
					minimum_amount: 5050,
					minimum_amount_currency: "usd",
				},
			}),
		);
	});

	it("puts no minimum on a percent code", async () => {
		await create({ ...amountCode, kind: "percent", value: 20 });

		expect(couponsCreate).toHaveBeenCalledWith(
			expect.objectContaining({ percent_off: 20 }),
		);
		expect(promoCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				restrictions: { first_time_transaction: false },
			}),
		);
	});

	it("answers with the code and records who made it", async () => {
		const response = await create(amountCode);

		expect(await response.json()).toEqual({
			id: "promo_1",
			code: "LAUNCH",
			percentOff: null,
			amountOff: 5000,
			timesRedeemed: 0,
			maxRedemptions: null,
			expiresAt: null,
			firstPurchaseOnly: false,
			active: true,
		});
		expect(auditCreate).toHaveBeenCalledWith({
			data: expect.objectContaining({
				actorUserId: "admin1",
				entity: "stripe_promotion_code",
				entityId: "promo_1",
				action: AuditAction.CREATE,
			}),
		});
	});

	it("answers 409 when Stripe already has the code, and drops the coupon", async () => {
		promoCreate.mockRejectedValue(
			Object.assign(new Error("An active promotion code already exists."), {
				type: "StripeInvalidRequestError",
				code: "resource_already_exists",
			}),
		);

		const response = await create(amountCode);

		expect(response.status).toBe(409);
		expect(await response.json()).toMatchObject({ error: "codeTaken" });
		expect(couponsDel).toHaveBeenCalledWith("co_1");
		expect(auditCreate).not.toHaveBeenCalled();
	});
});

describe("turning a promotion code off and on", () => {
	it("turns it off and records it", async () => {
		const response = await patch({ active: false });

		expect(response.status).toBe(200);
		expect(promoUpdate).toHaveBeenCalledWith(
			"promo_1",
			expect.objectContaining({ active: false }),
		);
		expect(auditCreate).toHaveBeenCalledWith({
			data: expect.objectContaining({ action: AuditAction.UPDATE }),
		});
	});

	it("turns it back on", async () => {
		promoUpdate.mockResolvedValueOnce(stripePromo({ active: true }));

		const response = await patch({ active: true });

		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({ active: true });
	});

	it("answers 409 when Stripe will not turn it back on", async () => {
		promoUpdate.mockRejectedValueOnce(
			Object.assign(new Error("This promotion code has expired."), {
				type: "StripeInvalidRequestError",
			}),
		);

		const response = await patch({ active: true });

		expect(response.status).toBe(409);
		expect(await response.json()).toMatchObject({ error: "cannotActivate" });
		expect(auditCreate).not.toHaveBeenCalled();
	});

	it.each([{}, { active: "yes" }])("refuses %j", async (body) => {
		expect((await patch(body)).status).toBe(400);
		expect(promoUpdate).not.toHaveBeenCalled();
	});

	it("sends Stripe nothing but the off switch", async () => {
		await patch({ active: false, max_redemptions: 5 });

		expect(promoUpdate).toHaveBeenCalledWith("promo_1", {
			active: false,
			expand: ["promotion.coupon"],
		});
	});
});
