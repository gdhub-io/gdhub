import { PaymentStatus } from "@gdhub-io/gdhub-prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";

const unpickedSince = vi.fn();
const cancelUnpicked = vi.fn();
const paymentFindFirst = vi.fn();
const refund = vi.fn();
const notifyAuthorOfLapse = vi.fn();

vi.mock("@/repositories/checkpoints/payment", async (importOriginal) => ({
	...(await importOriginal<object>()),
	unpickedSince: (...a: unknown[]) => unpickedSince(...a),
	cancelUnpicked: (...a: unknown[]) => cancelUnpicked(...a),
}));
vi.mock("@/services/payments/gateway", () => ({
	gatewayFor: () => ({ refund: (...a: unknown[]) => refund(...a) }),
}));
vi.mock("@/services/checkpoints/notifications", () => ({
	notifyAuthorOfLapse: (...a: unknown[]) => notifyAuthorOfLapse(...a),
	notifyCuratorAsked: vi.fn(),
}));
vi.mock("@/services/prisma", () => ({
	prisma: {
		payment: {
			findFirst: (...a: unknown[]) => paymentFindFirst(...a),
			update: vi.fn(),
		},
		refund: { create: vi.fn() },
		$transaction: vi.fn(async () => []),
	},
}));

const { cancelUnpickedCheckpoints } = await import(
	"@/services/checkpoints/flows/payment"
);

const NOW = new Date("2026-11-20T09:00:00Z");

beforeEach(() => {
	vi.clearAllMocks();
	unpickedSince.mockResolvedValue([{ payableId: "cp1", amount: 30000 }]);
	cancelUnpicked.mockResolvedValue(true);
	paymentFindFirst.mockResolvedValue({
		id: "pay1",
		amount: 30000,
		currency: "EUR",
		status: PaymentStatus.COMPLETED,
		provider: "PADDLE",
		providerTransactionId: "txn_1",
	});
	refund.mockResolvedValue({ id: "adj_1", amount: 30000, currency: "EUR" });
});

describe("a checkpoint nobody picks a curator for", () => {
	it("looks 14 days back from the curator's refusal", async () => {
		await cancelUnpickedCheckpoints(NOW);

		expect(unpickedSince).toHaveBeenCalledWith(new Date("2026-11-06T09:00:00Z"));
	});

	it("is cancelled, refunded and its author told", async () => {
		await expect(cancelUnpickedCheckpoints(NOW)).resolves.toBe(1);

		expect(cancelUnpicked).toHaveBeenCalledWith("cp1");
		expect(refund).toHaveBeenCalledWith("txn_1");
		expect(notifyAuthorOfLapse).toHaveBeenCalledWith("cp1", expect.any(String));
	});

	it("keeps its money when its author picked a curator at that moment", async () => {
		cancelUnpicked.mockResolvedValue(false);

		await expect(cancelUnpickedCheckpoints(NOW)).resolves.toBe(0);
		expect(refund).not.toHaveBeenCalled();
		expect(notifyAuthorOfLapse).not.toHaveBeenCalled();
	});
});
