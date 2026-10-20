import {
	CheckpointCuratorKind,
	CheckpointStatus,
	CheckpointVerdict,
} from "@gdhub-io/gdhub-prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { bookSessions, SlotTakenError } from "@/repositories/advisor-availability";
import { assignCurator, writeAdminVerdict } from "@/repositories/checkpoint-admin";
import { startAiCheckpoint } from "@/repositories/checkpoint-payment";
import { refundCaseOf } from "@/repositories/checkpoint-refund";
import { afterVerdictSent } from "@/repositories/checkpoint-verdict.repository";
import { notifyCuratorAsked } from "@/services/checkpoint-notifications";
import { prisma } from "@/services/prisma";
import { refundCheckout } from "@/services/stripe/server";

vi.mock("@/services/prisma", () => {
	const client = {
		projectCheckpoint: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
		user: { findUnique: vi.fn() },
		refund: { upsert: vi.fn() },
		payment: { update: vi.fn() },
		auditLog: { create: vi.fn() },
		$transaction: vi.fn(),
	};
	client.$transaction.mockImplementation(async (arg: unknown) =>
		typeof arg === "function" ? (arg as (tx: unknown) => unknown)(client) : arg,
	);
	return { prisma: client };
});
vi.mock("@/services/stripe/server", () => ({ refundCheckout: vi.fn() }));
vi.mock("@/repositories/checkpoint-refund", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/repositories/checkpoint-refund")>()),
	refundCaseOf: vi.fn(),
}));
vi.mock("@/repositories/checkpoint-verdict.repository", () => ({
	afterVerdictSent: vi.fn(),
}));
vi.mock("@/repositories/checkpoint-payment", () => ({ startAiCheckpoint: vi.fn() }));
vi.mock("@/repositories/advisor-availability", () => ({
	bookSessions: vi.fn(),
	SlotTakenError: class SlotTakenError extends Error {},
}));
vi.mock("@/services/checkpoint-notifications", () => ({
	notify: vi.fn(),
	notifyAuthorOfRefund: vi.fn(),
	notifyCuratorAsked: vi.fn(),
	recipient: { select: { id: true, email: true } },
	appUrl: () => "",
}));

const NOW = new Date("2026-10-25T12:00:00.000Z");
const call = (index: number, held: boolean) => ({
	index,
	curatorJoinedAt: held ? new Date("2026-10-01") : null,
	contentStatus: null,
});

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(prisma.$transaction).mockImplementation((async (arg: unknown) =>
		typeof arg === "function"
			? (arg as (tx: unknown) => unknown)(prisma)
			: arg) as never);
});

describe("an administrator's verdict", () => {
	const overdue = {
		status: CheckpointStatus.Review,
		verdict: null,
		// Due by 20 Oct: overdue on the 25th.
		dueAt: new Date("2026-10-17T00:00:00.000Z"),
		curatorKind: CheckpointCuratorKind.Human,
	};
	const paidCase = (held: number) => ({
		refund: {
			curatorKind: CheckpointCuratorKind.Human,
			status: CheckpointStatus.Review,
			paid: 45000,
			paidAt: new Date("2026-09-15"),
			dueAt: overdue.dueAt,
			verdictSent: false,
			sessions: [1, 2, 3, 4, 5].map((index) => call(index, index <= held)),
		},
		payment: { id: "pay1", amount: 45000, providerTransactionId: "cs_1", refunds: [] },
	});
	const input = { verdict: CheckpointVerdict.GoalMissed, note: "No final build." };

	beforeEach(() => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(overdue as never);
		vi.mocked(prisma.projectCheckpoint.updateMany).mockResolvedValue({ count: 1 } as never);
		vi.mocked(refundCheckout).mockResolvedValue({
			id: "re_1",
			amount: 15000,
			currency: "usd",
		} as never);
	});

	it("refunds the calls never joined, then closes with the admin's verdict", async () => {
		// Three calls held, the admin's verdict counts: 2 of 6 parts back.
		vi.mocked(refundCaseOf).mockResolvedValue(paidCase(3) as never);

		const result = await writeAdminVerdict("cp1", "admin1", input, NOW);

		expect(result).toEqual({ ok: true, refunded: 15000 });
		expect(refundCheckout).toHaveBeenCalledWith("cs_1", {
			amount: 15000,
			idempotencyKey: "checkpoint-refund-cp1",
		});
		expect(prisma.refund.upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				create: expect.objectContaining({ amount: 15000, reason: "missedCalls" }),
			}),
		);
		expect(prisma.projectCheckpoint.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "cp1", status: CheckpointStatus.Review, verdict: null },
				data: expect.objectContaining({
					status: CheckpointStatus.Closed,
					verdict: CheckpointVerdict.GoalMissed,
					decidedById: "admin1",
				}),
			}),
		);
		expect(afterVerdictSent).toHaveBeenCalledWith("cp1");
	});

	it("asks Stripe for nothing when every call was held", async () => {
		vi.mocked(refundCaseOf).mockResolvedValue(paidCase(5) as never);

		await expect(writeAdminVerdict("cp1", "admin1", input, NOW)).resolves.toEqual({
			ok: true,
			refunded: 0,
		});
		expect(refundCheckout).not.toHaveBeenCalled();
	});

	it("writes nothing when Stripe refuses", async () => {
		vi.mocked(refundCaseOf).mockResolvedValue(paidCase(3) as never);
		vi.mocked(refundCheckout).mockRejectedValue(new Error("card"));

		await expect(writeAdminVerdict("cp1", "admin1", input, NOW)).resolves.toEqual({
			ok: false,
			error: "refundFailed",
		});
		expect(prisma.projectCheckpoint.updateMany).not.toHaveBeenCalled();
	});

	it("waits for day 32 before an admin may write it", async () => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue({
			...overdue,
			dueAt: new Date("2026-10-23T00:00:00.000Z"),
		} as never);

		await expect(writeAdminVerdict("cp1", "admin1", input, NOW)).resolves.toEqual({
			ok: false,
			error: "notOverdue",
		});
	});

	it("lets the curator's own verdict stand when it lands first", async () => {
		vi.mocked(refundCaseOf).mockResolvedValue(paidCase(5) as never);
		vi.mocked(prisma.projectCheckpoint.updateMany).mockResolvedValue({ count: 0 } as never);

		await expect(writeAdminVerdict("cp1", "admin1", input, NOW)).resolves.toEqual({
			ok: false,
			error: "alreadyDecided",
		});
		expect(afterVerdictSent).not.toHaveBeenCalled();
	});
});

describe("assigning a curator by hand", () => {
	const draft = (over: Record<string, unknown> = {}) => ({
		status: CheckpointStatus.Draft,
		goal: "A playable greybox",
		curatorKind: CheckpointCuratorKind.Human,
		curatorId: null,
		startedAt: new Date("2026-11-02T09:00:00.000Z"),
		project: { name: "Hollow Tide", slug: "hollow-tide", author: { id: "a1", email: "a@x" } },
		_count: { items: 2 },
		sessions: [{ index: 3 }],
		...over,
	});

	beforeEach(() => {
		vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "u9", email: "c@x" } as never);
	});

	it("starts an AI checkpoint from a draft with no payment", async () => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(draft() as never);

		await expect(
			assignCurator("cp1", "admin1", { kind: CheckpointCuratorKind.AI, reason: "Partner" }),
		).resolves.toEqual({ ok: true });
		expect(startAiCheckpoint).toHaveBeenCalledWith("cp1", null);
	});

	it("books a person's calls and asks them, as a payment would", async () => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(draft() as never);

		await assignCurator("cp1", "admin1", {
			kind: CheckpointCuratorKind.Human,
			userId: "u9",
			reason: "Partner",
		});

		expect(bookSessions).toHaveBeenCalled();
		expect(prisma.projectCheckpoint.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					curatorId: "u9",
					status: CheckpointStatus.AwaitingCurator,
				}),
			}),
		);
		expect(notifyCuratorAsked).toHaveBeenCalledWith("cp1");
	});

	it("refuses a draft without a goal, and one whose first call is taken", async () => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValueOnce(
			draft({ goal: "  " }) as never,
		);
		await expect(
			assignCurator("cp1", "admin1", { kind: CheckpointCuratorKind.AI, reason: "x x" }),
		).resolves.toEqual({ ok: false, error: "draftIncomplete" });

		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValueOnce(draft() as never);
		vi.mocked(bookSessions).mockRejectedValueOnce(new SlotTakenError());
		await expect(
			assignCurator("cp1", "admin1", {
				kind: CheckpointCuratorKind.Human,
				userId: "u9",
				reason: "x x",
			}),
		).resolves.toEqual({ ok: false, error: "slotTaken" });
		expect(prisma.auditLog.create).not.toHaveBeenCalled();
	});

	it("swaps the person on a running checkpoint, never to the AI", async () => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
			draft({ status: CheckpointStatus.Active, curatorId: "u1" }) as never,
		);

		await expect(
			assignCurator("cp1", "admin1", {
				kind: CheckpointCuratorKind.Human,
				userId: "u9",
				reason: "Missed two calls",
			}),
		).resolves.toEqual({ ok: true });
		// The payout reads from which call the new curator took over.
		expect(prisma.auditLog.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				meta: expect.objectContaining({
					fromCuratorId: "u1",
					toCuratorId: "u9",
					fromSession: 3,
				}),
			}),
		});
		await expect(
			assignCurator("cp1", "admin1", { kind: CheckpointCuratorKind.AI, reason: "x x" }),
		).resolves.toEqual({ ok: false, error: "notSwappable" });
	});
});
