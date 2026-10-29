import {
	PayableType,
	PaymentProvider,
	PaymentStatus,
} from "@gdhub-io/gdhub-prisma";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { returnToAuthor } from "@/repositories/checkpoints/payment";
import { notifyAuthorOfAnswer } from "@/services/checkpoints/notifications";
import { prisma } from "@/services/prisma";
import {
	getCheckoutReceiptUrl,
	releaseCheckout,
} from "@/services/stripe/server";

const authMock = vi.fn();

vi.mock("@/auth", () => ({ auth: () => authMock() }));

vi.mock("@/services/prisma", () => ({
	prisma: {
		payment: { findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn() },
		projectCheckpoint: { findFirst: vi.fn() },
		queueJobLog: { create: vi.fn() },
	},
}));

vi.mock("@/services/stripe/server", () => ({
	getCheckoutReceiptUrl: vi.fn(),
	releaseCheckout: vi.fn(),
}));

vi.mock("@/services/paddle/server", () => ({
	getTransactionInvoiceUrl: vi.fn(async () => "https://paddle/invoice.pdf"),
}));

vi.mock("@/services/checkpoints/flows/payment", () => ({
	reconcileCheckout: vi.fn(async () => false),
}));

vi.mock("@/repositories/checkpoints/payment", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/repositories/checkpoints/payment")>()),
	returnToAuthor: vi.fn(),
}));

vi.mock("@/services/checkpoints/notifications", () => ({
	notifyAuthorOfAnswer: vi.fn(),
}));

beforeEach(() => {
	vi.clearAllMocks();
	authMock.mockResolvedValue({
		user: { id: "u1", roles: ["Member"], onboardingDone: true },
	});
});

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("a checkpoint receipt", () => {
	const get = async () => {
		const { GET } = await import("@/app/api/user/payment/receipt/route");

		return (GET as (r: NextRequest, c: unknown) => Promise<Response>)(
			new NextRequest("http://localhost/api/user/payment/receipt?paymentId=pay_1"),
			{ params: Promise.resolve({}) },
		);
	};

	// Nobody may fetch another person's receipt by guessing an id.
	it("looks only at the caller's own checkpoint payments", async () => {
		vi.mocked(prisma.payment.findFirst).mockResolvedValue(null);

		expect((await get()).status).toBe(404);
		expect(prisma.payment.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					id: "pay_1",
					payerId: "u1",
					payableType: PayableType.CHECKPOINT,
					status: { in: [PaymentStatus.PROCESSING, PaymentStatus.COMPLETED] },
				},
			}),
		);
	});

	it("asks Paddle for a Paddle payment's invoice", async () => {
		vi.mocked(prisma.payment.findFirst).mockResolvedValue({
			provider: PaymentProvider.PADDLE,
			providerTransactionId: "txn_1",
		} as never);

		const response = await get();

		expect(await response.json()).toEqual({
			url: "https://paddle/invoice.pdf",
		});
		expect(getCheckoutReceiptUrl).not.toHaveBeenCalled();
	});

	it("asks Stripe for a Stripe payment's receipt", async () => {
		vi.mocked(prisma.payment.findFirst).mockResolvedValue({
			provider: PaymentProvider.STRIPE,
			providerTransactionId: "cs_1",
		} as never);
		vi.mocked(getCheckoutReceiptUrl).mockResolvedValue("https://stripe/r");

		expect(await (await get()).json()).toEqual({ url: "https://stripe/r" });
		expect(getCheckoutReceiptUrl).toHaveBeenCalledWith("cs_1");
	});

	it("answers 401 without a session", async () => {
		authMock.mockResolvedValue(null);

		expect((await get()).status).toBe(401);
		expect(prisma.payment.findFirst).not.toHaveBeenCalled();
	});
});

describe("the holds cron", () => {
	const run = async () => {
		vi.stubEnv("CRON_SECRET", "cron");
		const { GET } = await import("@/app/api/cron/checkpoint-holds/route");

		return (GET as (r: NextRequest, c: unknown) => Promise<Response>)(
			new NextRequest("http://localhost/api/cron/checkpoint-holds", {
				headers: { authorization: "Bearer cron" },
			}),
			{ params: Promise.resolve({}) },
		);
	};

	// Paddle charges at once: a PROCESSING Paddle row is money taken, not a
	// Stripe hold, and a Stripe release on a Paddle id can never return it.
	it("never sends a Paddle transaction to Stripe to be released", async () => {
		vi.mocked(prisma.payment.findMany).mockResolvedValue([]);

		await run();

		expect(prisma.payment.findMany).toHaveBeenLastCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					provider: PaymentProvider.STRIPE,
					status: PaymentStatus.PROCESSING,
				}),
			}),
		);
	});

	it("releases a stale Stripe hold", async () => {
		vi.mocked(prisma.payment.findMany)
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([
				{
					id: "pay_1",
					payableId: "cp1",
					provider: PaymentProvider.STRIPE,
					providerTransactionId: "cs_1",
				},
			] as never);
		vi.mocked(releaseCheckout).mockResolvedValue({} as never);

		await run();

		expect(releaseCheckout).toHaveBeenCalledWith("cs_1");
		expect(prisma.payment.update).toHaveBeenCalledWith({
			where: { id: "pay_1" },
			data: { status: PaymentStatus.CANCELED },
		});
	});

	const staleHold = () => {
		vi.mocked(prisma.payment.findMany)
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([
				{
					id: "pay_1",
					payableId: "cp1",
					provider: PaymentProvider.STRIPE,
					providerTransactionId: "cs_1",
				},
			] as never);
		vi.mocked(releaseCheckout).mockResolvedValue({} as never);
		vi.mocked(prisma.projectCheckpoint.findFirst).mockResolvedValue({
			curatorId: "u9",
			curator: { name: "Marta" },
		} as never);
	};

	it("hands a checkpoint nobody answered back to its author, and says so", async () => {
		staleHold();
		vi.mocked(returnToAuthor).mockResolvedValue(true);

		await run();

		expect(returnToAuthor).toHaveBeenCalledWith("cp1", "u9");
		expect(notifyAuthorOfAnswer).toHaveBeenCalledWith("cp1", "Marta", "silent");
	});

	// The curator answered between the read and the write: their answer stands,
	// and the author is not told the curator went quiet.
	it("tells the author nothing when the curator answered meanwhile", async () => {
		staleHold();
		vi.mocked(returnToAuthor).mockResolvedValue(false);

		await run();

		expect(returnToAuthor).toHaveBeenCalledWith("cp1", "u9");
		expect(notifyAuthorOfAnswer).not.toHaveBeenCalled();
	});
});
