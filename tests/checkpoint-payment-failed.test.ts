import { CheckpointStatus, PaymentStatus } from "@gdhub-io/gdhub-prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUnfinishedCheckpoint } from "@/repositories/checkpoint.repository";
import { prisma } from "@/services/prisma";

vi.mock("@/services/prisma", () => ({
	prisma: {
		projectCheckpoint: { findFirst: vi.fn() },
		payment: { findFirst: vi.fn() },
	},
}));

const draft = (overrides: Record<string, unknown> = {}) => ({
	id: "cp1",
	status: CheckpointStatus.Draft,
	paymentId: null,
	startedAt: null,
	items: [],
	reports: [],
	pulses: [],
	curator: null,
	project: { team: { members: [] } },
	...overrides,
});

const lastPayment = (status: PaymentStatus | null) =>
	vi
		.mocked(prisma.payment.findFirst)
		.mockResolvedValue(status ? ({ status } as never) : null);

const failed = async () =>
	(await getUnfinishedCheckpoint("p1"))?.paymentFailed;

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(prisma.projectCheckpoint.findFirst).mockResolvedValue(
		draft() as never,
	);
});

describe("a draft's failed payment", () => {
	it("is failed when the last checkout failed or expired", async () => {
		lastPayment(PaymentStatus.FAILED);
		expect(await failed()).toBe(true);

		lastPayment(PaymentStatus.CANCELED);
		expect(await failed()).toBe(true);
	});

	// Open in another tab, or paid with the webhook still on its way.
	it("is not failed while the last checkout is pending", async () => {
		lastPayment(PaymentStatus.PENDING);
		expect(await failed()).toBe(false);
	});

	it("is not failed before any checkout was opened", async () => {
		lastPayment(null);
		expect(await failed()).toBe(false);
	});

	it("never looks at payments once the checkpoint carries one", async () => {
		vi.mocked(prisma.projectCheckpoint.findFirst).mockResolvedValue(
			draft({ paymentId: "pay1" }) as never,
		);
		lastPayment(PaymentStatus.CANCELED);

		expect(await failed()).toBe(false);
		expect(prisma.payment.findFirst).not.toHaveBeenCalled();
	});
});
