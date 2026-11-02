import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = {
	payment: {
		findFirst: vi.fn(),
		update: vi.fn(),
		create: vi.fn(),
		updateMany: vi.fn(),
	},
	teamVacancy: { update: vi.fn() },
};
const checkoutState = vi.fn();
const createTransaction = vi.fn();

vi.mock("@/services/prisma", () => ({ prisma }));
vi.mock("@/services/novu", () => ({ NovuService: { send: vi.fn() } }));
vi.mock("@/services/payments/paddle", () => ({
	paddleGateway: { checkoutState },
}));
vi.mock("@/services/paddle/server", () => ({
	paddleClient: () => ({ transactions: { create: createTransaction } }),
}));

const { reconcileListingFee, settleListingFee, startListingFeeCheckout } =
	await import("@/services/vacancies/listing-fee");

const pending = {
	id: "pay1",
	payableId: "v1",
	amount: 900,
	status: "PENDING",
	providerTransactionId: "txn_1",
};
const paid = {
	state: "paid",
	transactionId: "txn_1",
	amount: 900,
	customerId: "ctm_1",
	invoiceId: null,
	charged: true,
	held: false,
};

beforeEach(() => {
	vi.clearAllMocks();
	vi.stubEnv("NEXT_PUBLIC_PADDLE_VACANCY_PRICE_ID", "pri_vacancy");
	prisma.teamVacancy.update.mockResolvedValue({ title: "Artist", team: null });
});

// GDHUB-128: the fee settles without the webhook, and only once.
describe("the vacancy listing fee", () => {
	it("publishes the vacancy when Paddle says the fee was paid", async () => {
		prisma.payment.findFirst.mockResolvedValue(pending);
		checkoutState.mockResolvedValue(paid);
		prisma.payment.updateMany.mockResolvedValue({ count: 1 });

		expect(await reconcileListingFee("v1")).toBe(true);
		expect(prisma.teamVacancy.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "v1" },
				data: expect.objectContaining({ status: "Published" }),
			}),
		);
	});

	it("leaves the draft alone while the checkout is still open", async () => {
		prisma.payment.findFirst.mockResolvedValue(pending);
		checkoutState.mockResolvedValue({ state: "open" });

		expect(await reconcileListingFee("v1")).toBe(false);
		expect(prisma.payment.updateMany).not.toHaveBeenCalled();
		expect(prisma.teamVacancy.update).not.toHaveBeenCalled();
	});

	it("publishes once when the webhook and the way back race", async () => {
		prisma.payment.updateMany.mockResolvedValue({ count: 0 });

		expect(await settleListingFee(pending, paid as never)).toBe(false);
		expect(prisma.teamVacancy.update).not.toHaveBeenCalled();
	});

	it("reuses an open checkout instead of making a second transaction", async () => {
		prisma.payment.findFirst.mockResolvedValue(pending);
		prisma.payment.update.mockResolvedValue(pending);
		checkoutState.mockResolvedValue({ state: "open" });

		expect(await startListingFeeCheckout("v1", "author")).toBe("txn_1");
		expect(createTransaction).not.toHaveBeenCalled();
	});

	it("makes a transaction tied to the fee when there is none", async () => {
		prisma.payment.findFirst.mockResolvedValue(null);
		prisma.payment.create.mockResolvedValue({
			...pending,
			providerTransactionId: null,
		});
		createTransaction.mockResolvedValue({ id: "txn_new" });

		expect(await startListingFeeCheckout("v1", "author")).toBe("txn_new");
		expect(createTransaction).toHaveBeenCalledWith(
			expect.objectContaining({
				customData: { paymentId: "pay1", vacancyId: "v1" },
			}),
		);
		expect(prisma.payment.update).toHaveBeenCalledWith({
			where: { id: "pay1" },
			data: { providerTransactionId: "txn_new" },
		});
	});
});
