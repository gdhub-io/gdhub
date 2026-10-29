import { ApiError } from "@paddle/paddle-node-sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	PromoCodeMissingError,
	PromoCodeRefusedError,
	PromoCodeTakenError,
} from "@/services/payments/gateway";
import { paddleGateway } from "@/services/payments/paddle";

const sdk = vi.hoisted(() => ({
	transactions: { create: vi.fn(), get: vi.fn(), update: vi.fn() },
	adjustments: { create: vi.fn() },
	discounts: { list: vi.fn(), create: vi.fn(), update: vi.fn() },
}));

vi.mock("@paddle/paddle-node-sdk", async (importOriginal) => ({
	...(await importOriginal<typeof import("@paddle/paddle-node-sdk")>()),
	Paddle: class {
		transactions = sdk.transactions;
		adjustments = sdk.adjustments;
		discounts = sdk.discounts;
	},
}));

vi.mock("@/services/paddle/server", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/services/paddle/server")>()),
	getTransactionInvoiceUrl: vi.fn(),
}));

const AI_PRICE = "pri_ai";

const apiError = (code: string, detail = "") =>
	new ApiError(
		{ type: "request_error", code, detail, documentation_url: "" },
		null,
	);

const transaction = (over: Record<string, unknown> = {}) => ({
	id: "txn_1",
	status: "completed",
	customerId: "ctm_1",
	invoiceId: "inv_1",
	details: {
		totals: { grandTotal: "2000" },
		lineItems: [{ id: "txnitm_1" }],
	},
	...over,
});

const discount = (over: Record<string, unknown> = {}) => ({
	id: "dsc_1",
	code: "LAUNCH",
	type: "percentage",
	amount: "20",
	timesUsed: 3,
	usageLimit: null,
	expiresAt: null,
	status: "active",
	restrictTo: [AI_PRICE],
	...over,
});

async function* iterate<T>(items: T[]) {
	yield* items;
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.stubEnv("PADDLE_API_KEY", "pdl_test");
	vi.stubEnv("PADDLE_AI_CHECKPOINT_PRICE_ID", AI_PRICE);
	sdk.transactions.create.mockResolvedValue({ id: "txn_1" });
	sdk.transactions.get.mockResolvedValue(transaction());
	sdk.adjustments.create.mockResolvedValue({
		id: "adj_1",
		totals: { total: "700" },
		currencyCode: "USD",
	});
	sdk.discounts.create.mockImplementation(async (body) =>
		discount({ ...body, id: "dsc_new" }),
	);
});

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("starting a Paddle checkout", () => {
	const input = {
		paymentId: "pay_1",
		checkpointId: "cp1",
		amount: 2000,
		currency: "USD",
		name: "Tide — checkpoint 1",
		description: "",
		customerEmail: "a@x.io",
		successUrl: "https://gdhub.io/ready",
		cancelUrl: "https://gdhub.io/payment",
	};

	// What is sold and which row it settles are decided here, not in the browser.
	it("sells the AI price and links the transaction to our payment", async () => {
		const result = await paddleGateway.startCheckout(input);

		expect(sdk.transactions.create).toHaveBeenCalledWith({
			items: [{ priceId: AI_PRICE, quantity: 1 }],
			customData: { paymentId: "pay_1", checkpointId: "cp1" },
		});
		expect(result).toEqual({
			transactionId: "txn_1",
			start: {
				paddleTransactionId: "txn_1",
				customerEmail: "a@x.io",
				successUrl: "https://gdhub.io/ready",
			},
		});
	});
});

describe("asking Paddle what became of a checkout", () => {
	it.each(["paid", "completed"])(
		"reads %s as paid at the grand total, with nothing held",
		async (status) => {
			sdk.transactions.get.mockResolvedValue(transaction({ status }));

			await expect(paddleGateway.checkoutState("txn_1")).resolves.toEqual({
				state: "paid",
				transactionId: "txn_1",
				amount: 2000,
				customerId: "ctm_1",
				invoiceId: "inv_1",
				charged: true,
				held: false,
			});
		},
	);

	it("reads a zero grand total as nothing charged", async () => {
		sdk.transactions.get.mockResolvedValue(
			transaction({ details: { totals: { grandTotal: "0" }, lineItems: [] } }),
		);

		await expect(paddleGateway.checkoutState("txn_1")).resolves.toMatchObject({
			state: "paid",
			amount: 0,
			charged: false,
		});
	});

	it("reads a cancelled transaction as expired", async () => {
		sdk.transactions.get.mockResolvedValue(transaction({ status: "canceled" }));

		await expect(paddleGateway.checkoutState("txn_1")).resolves.toEqual({
			state: "expired",
		});
	});

	it.each(["draft", "ready", "billed", "past_due"])(
		"reads %s as still open",
		async (status) => {
			sdk.transactions.get.mockResolvedValue(transaction({ status }));

			await expect(paddleGateway.checkoutState("txn_1")).resolves.toEqual({
				state: "open",
			});
		},
	);

	it("cancels an abandoned checkout at Paddle", async () => {
		await paddleGateway.cancelCheckout("txn_1");

		expect(sdk.transactions.update).toHaveBeenCalledWith("txn_1", {
			status: "canceled",
		});
	});
});

describe("a Paddle refund", () => {
	it("sends a part as a partial adjustment on the line item", async () => {
		const refund = await paddleGateway.refund("txn_1", {
			amount: 700,
			idempotencyKey: "checkpoint-refund-cp1",
		});

		expect(sdk.adjustments.create).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "refund",
				type: "partial",
				transactionId: "txn_1",
				items: [{ itemId: "txnitm_1", type: "partial", amount: "700" }],
			}),
		);
		expect(refund).toEqual({ id: "adj_1", amount: 700, currency: "USD" });
	});

	it("sends a full refund without items", async () => {
		await paddleGateway.refund("txn_1");

		const body = sdk.adjustments.create.mock.calls[0][0];
		expect(body).toMatchObject({
			action: "refund",
			type: "full",
			transactionId: "txn_1",
		});
		expect(body).not.toHaveProperty("items");
	});

	// Paddle refunds only a completed transaction; anything else would throw later.
	it.each(["paid", "billed", "canceled"])(
		"refuses a %s transaction without asking Paddle",
		async (status) => {
			sdk.transactions.get.mockResolvedValue(transaction({ status }));

			await expect(paddleGateway.refund("txn_1")).resolves.toBeNull();
			expect(sdk.adjustments.create).not.toHaveBeenCalled();
		},
	);
});

describe("Paddle promotion codes", () => {
	const code = {
		code: "LAUNCH",
		kind: "percent" as const,
		value: 20,
		firstPurchaseOnly: false,
	};

	it("has no first-purchase restriction", () => {
		expect(paddleGateway.promoCodes.firstPurchase).toBe(false);
	});

	it("makes a percent code restricted to the AI price", async () => {
		const promo = await paddleGateway.promoCodes.create(code);

		expect(sdk.discounts.create).toHaveBeenCalledWith(
			expect.objectContaining({
				code: "LAUNCH",
				type: "percentage",
				amount: "20",
				restrictTo: [AI_PRICE],
				enabledForCheckout: true,
				recur: false,
			}),
		);
		expect(sdk.discounts.create.mock.calls[0][0]).not.toHaveProperty(
			"currencyCode",
		);
		expect(promo).toMatchObject({ percentOff: 20, amountOff: null });
	});

	it("makes an amount code flat in minor units of USD", async () => {
		const promo = await paddleGateway.promoCodes.create({
			...code,
			kind: "amount",
			value: 5,
			maxRedemptions: 10,
			expiresAt: "2030-01-01T00:00:00.000Z",
		});

		expect(sdk.discounts.create).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "flat",
				amount: "500",
				currencyCode: "USD",
				restrictTo: [AI_PRICE],
				usageLimit: 10,
				expiresAt: "2030-01-01T00:00:00.000Z",
			}),
		);
		expect(promo).toMatchObject({ percentOff: null, amountOff: 500 });
	});

	// $20 less $19 leaves $1; $20 less $20 would leave nothing, under the $0.50 floor.
	it("keeps an amount code at least $0.50 short of the price", async () => {
		await expect(
			paddleGateway.promoCodes.create({ ...code, kind: "amount", value: 19 }),
		).resolves.toMatchObject({ amountOff: 1900 });

		await expect(
			paddleGateway.promoCodes.create({ ...code, kind: "amount", value: 20 }),
		).rejects.toThrow(new PromoCodeRefusedError("amountTooHigh"));
		expect(sdk.discounts.create).toHaveBeenCalledTimes(1);
	});

	// Vacancy discounts live in the same Paddle account.
	it("lists only discounts restricted to the AI price", async () => {
		sdk.discounts.list.mockReturnValue(
			iterate([
				discount({ id: "dsc_ai" }),
				discount({ id: "dsc_vacancy", restrictTo: ["pri_vacancy"] }),
				discount({ id: "dsc_any", restrictTo: null }),
				discount({
					id: "dsc_off",
					type: "flat",
					amount: "300",
					status: "archived",
					restrictTo: ["pri_vacancy", AI_PRICE],
				}),
			]),
		);

		const codes = await paddleGateway.promoCodes.list();

		expect(codes.map((c) => c.id)).toEqual(["dsc_ai", "dsc_off"]);
		expect(codes[1]).toMatchObject({
			amountOff: 300,
			percentOff: null,
			active: false,
			firstPurchaseOnly: false,
		});
		expect(codes[0]).toMatchObject({ timesRedeemed: 3, active: true });
	});

	it("archives a code it turns off and reactivates one it turns on", async () => {
		sdk.discounts.update.mockResolvedValue(discount({ status: "archived" }));

		await expect(
			paddleGateway.promoCodes.setActive("dsc_1", false),
		).resolves.toMatchObject({ active: false });
		expect(sdk.discounts.update).toHaveBeenCalledWith("dsc_1", {
			status: "archived",
		});

		sdk.discounts.update.mockResolvedValue(discount());
		await paddleGateway.promoCodes.setActive("dsc_1", true);
		expect(sdk.discounts.update).toHaveBeenLastCalledWith("dsc_1", {
			status: "active",
		});
	});

	describe("Paddle's errors, as the routes read them", () => {
		it.each(["not_found", "entity_not_found"])(
			"%s is a missing code",
			async (errorCode) => {
				sdk.discounts.update.mockRejectedValue(apiError(errorCode));

				await expect(
					paddleGateway.promoCodes.setActive("dsc_x", true),
				).rejects.toBeInstanceOf(PromoCodeMissingError);
			},
		);

		it("a code conflict is a taken code", async () => {
			sdk.discounts.create.mockRejectedValue(
				apiError("discount_code_conflict", "A discount with this code exists"),
			);

			await expect(
				paddleGateway.promoCodes.create(code),
			).rejects.toBeInstanceOf(PromoCodeTakenError);
		});

		it("any other refusal carries Paddle's detail", async () => {
			sdk.discounts.update.mockRejectedValue(
				apiError("bad_request", "Discount has expired"),
			);

			await expect(
				paddleGateway.promoCodes.setActive("dsc_1", true),
			).rejects.toThrow(new PromoCodeRefusedError("Discount has expired"));
		});

		it("passes on what is not a Paddle error", async () => {
			const network = new Error("socket hang up");
			sdk.discounts.create.mockRejectedValue(network);

			await expect(paddleGateway.promoCodes.create(code)).rejects.toBe(
				network,
			);
		});
	});
});
