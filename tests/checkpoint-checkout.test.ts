import { CheckpointCuratorKind, CheckpointStatus } from "@gdhub-io/gdhub-prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CHECKPOINT_AI_PRICE } from "@/config/checkpoint";
import { curatorPrice } from "@/config/checkpoint-pricing";
import { SkillLevel } from "@/config/prisma-enums";
import { isFirstCallFree } from "@/repositories/advisor-availability";
import { checkpointCheckout } from "@/repositories/checkpoint-payment";
import { prisma } from "@/services/prisma";

vi.mock("@/repositories/advisor-availability", () => ({
	isFirstCallFree: vi.fn(async () => true),
	bookSessions: vi.fn(async () => undefined),
	SlotTakenError: class SlotTakenError extends Error {},
}));

vi.mock("@/services/prisma", () => ({
	prisma: {
		$transaction: vi.fn(),
		checkpointSession: { deleteMany: vi.fn() },
		projectCheckpoint: { findUnique: vi.fn() },
		speciality: { findFirst: vi.fn() },
		payment: { count: vi.fn() },
	},
}));

const checkpoint = (over: Record<string, unknown> = {}) => ({
	id: "cp1",
	order: 2,
	stageName: "Prototyping",
	status: CheckpointStatus.Draft,
	curatorKind: CheckpointCuratorKind.Human,
	curatorId: "u1",
	acceptedTermsAt: new Date("2026-09-17T00:00:00.000Z"),
	startedAt: new Date("2026-09-21T09:00:00.000Z"),
	curator: { name: "Marta Ilves" },
	project: { slug: "tide", name: "Tide" },
	...over,
});

beforeEach(() => {
	vi.mocked(prisma.$transaction).mockImplementation((async (arg: unknown) =>
		typeof arg === "function"
			? (arg as (tx: typeof prisma) => unknown)(prisma)
			: Promise.all(arg as unknown[])) as never);
	vi.clearAllMocks();
	vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
		checkpoint() as never,
	);
	vi.mocked(prisma.payment.count).mockResolvedValue(0 as never);
	vi.mocked(prisma.speciality.findFirst).mockResolvedValue({
		level: SkillLevel.Expert,
	} as never);
});

describe("what a checkpoint checkout would charge", () => {
	it("prices a person at their level, in minor units", async () => {
		const quote = await checkpointCheckout("cp1");

		expect(quote.ok).toBe(true);
		expect(quote.ok && quote.amount).toBe(curatorPrice(SkillLevel.Expert) * 100);
		expect(quote.ok && quote.currency).toBe("USD");
	});

	it("prices the AI curator at its own fixed price", async () => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
			checkpoint({
				curatorKind: CheckpointCuratorKind.AI,
				curatorId: null,
			}) as never,
		);

		const quote = await checkpointCheckout("cp1");

		expect(quote.ok && quote.amount).toBe(CHECKPOINT_AI_PRICE * 100);
		expect(prisma.speciality.findFirst).not.toHaveBeenCalled();
	});

	// The checkbox is the agreement. A client that hides it changes nothing.
	it("refuses until the agreement is accepted", async () => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
			checkpoint({ acceptedTermsAt: null }) as never,
		);

		await expect(checkpointCheckout("cp1")).resolves.toMatchObject({
			ok: false,
			reason: "termsNotAccepted",
		});
	});

	it("refuses a checkpoint that has already been paid for", async () => {
		vi.mocked(prisma.payment.count).mockResolvedValue(1 as never);

		await expect(checkpointCheckout("cp1")).resolves.toMatchObject({
			ok: false,
			reason: "alreadyPaid",
		});
	});

	it("refuses one that is no longer a draft", async () => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
			checkpoint({ status: CheckpointStatus.Active }) as never,
		);

		await expect(checkpointCheckout("cp1")).resolves.toMatchObject({
			ok: false,
			reason: "checkpointNotDraft",
		});
	});

	// Someone who has since stopped taking mentees cannot be bought, whatever
	// the draft still says.
	// The hour may have been booked by someone else since it was picked; the
	// card is not asked for a series that is no longer free.
	it("refuses a first call that no longer opens a free series", async () => {
		vi.mocked(isFirstCallFree).mockResolvedValueOnce(false);

		await expect(checkpointCheckout("cp1")).resolves.toMatchObject({
			ok: false,
			reason: "slotTaken",
		});
	});

	it("refuses a curator who is no longer open for mentoring", async () => {
		vi.mocked(prisma.speciality.findFirst).mockResolvedValue(null as never);

		await expect(checkpointCheckout("cp1")).resolves.toMatchObject({
			ok: false,
			reason: "curatorUnavailable",
		});
	});
});
