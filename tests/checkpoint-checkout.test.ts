import { CheckpointCuratorKind, CheckpointStatus } from "@gdhub-io/gdhub-prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CHECKPOINT_AI_PRICE, CHECKPOINT_MAX_TEAM } from "@/config/checkpoint";
import { curatorPrice } from "@/config/checkpoint-pricing";
import { SkillLevel } from "@/config/prisma-enums";
import { isFirstCallFree } from "@/repositories/advisor/availability";
import {
	checkpointCheckout,
	returnToAuthor,
} from "@/repositories/checkpoints/payment";
import { CONFIRMED_MEMBERS } from "@/repositories/scout/games";
import { prisma } from "@/services/prisma";


// The expert path is tested as it will run once open; `expert.open = false` tests the waitlist.
const expert = vi.hoisted(() => ({ open: true }));
vi.mock("@/config/checkpoint", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/config/checkpoint")>()),
	get EXPERT_CHECKPOINT_OPEN() {
		return expert.open;
	},
}));

vi.mock("@/repositories/advisor/availability", () => ({
	isFirstCallFree: vi.fn(async () => true),
	bookSessions: vi.fn(async () => undefined),
	SlotTakenError: class SlotTakenError extends Error {},
}));

vi.mock("@/services/prisma", () => ({
	prisma: {
		$transaction: vi.fn(),
		checkpointSession: { deleteMany: vi.fn() },
		projectCheckpoint: { findUnique: vi.fn(), updateMany: vi.fn() },
		speciality: { findFirst: vi.fn() },
		payment: { findFirst: vi.fn() },
	},
}));

const checkpoint = (over: Record<string, unknown> = {}) => ({
	id: "cp1",
	order: 2,
	stageName: "Prototyping",
	status: CheckpointStatus.Draft,
	curatorKind: CheckpointCuratorKind.Human,
	curatorId: "u1",
	startedAt: new Date("2026-09-21T09:00:00.000Z"),
	curator: { name: "Marta Ilves" },
	project: {
		id: "p1",
		slug: "tide",
		name: "Tide",
		team: { _count: { members: 3 } },
	},
	goal: "A playable vertical slice",
	_count: { items: 2 },
	...over,
});

beforeEach(() => {
	expert.open = true;
	vi.mocked(prisma.$transaction).mockImplementation((async (arg: unknown) =>
		typeof arg === "function"
			? (arg as (tx: typeof prisma) => unknown)(prisma)
			: Promise.all(arg as unknown[])) as never);
	vi.clearAllMocks();
	vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
		checkpoint() as never,
	);
	vi.mocked(prisma.payment.findFirst).mockResolvedValue(null);
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

	// The wizard checks these too; a client that skips it must still be refused.
	it.each([
		["goalMissing", { goal: "   " }],
		["inputsMissing", { _count: { items: 0 } }],
	])("refuses a draft with %s", async (reason, over) => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
			checkpoint(over) as never,
		);

		await expect(checkpointCheckout("cp1")).resolves.toEqual({
			ok: false,
			reason,
		});
	});

	// One price covers the team up to the cap; one person more asks for an offer.
	it("sells to a team at the cap and refuses one past it", async () => {
		const team = (members: number) =>
			checkpoint({
				project: {
					id: "p1",
					slug: "tide",
					name: "Tide",
					team: { _count: { members } },
				},
			}) as never;

		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValueOnce(
			team(CHECKPOINT_MAX_TEAM),
		);
		await expect(checkpointCheckout("cp1")).resolves.toMatchObject({
			ok: true,
		});

		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValueOnce(
			team(CHECKPOINT_MAX_TEAM + 1),
		);
		await expect(checkpointCheckout("cp1")).resolves.toEqual({
			ok: false,
			reason: "teamTooLarge",
		});
	});

	it("counts the team as it stands, without those who left", async () => {
		await checkpointCheckout("cp1");

		const [args] = vi.mocked(prisma.projectCheckpoint.findUnique).mock.calls[0];
		expect(
			(args as { select: { project: { select: { team: unknown } } } }).select
				.project.select.team,
		).toEqual({
			select: { _count: { select: { members: { where: CONFIRMED_MEMBERS } } } },
		});
	});

	it("counts only the day-1 inputs", async () => {
		await checkpointCheckout("cp1");

		const [args] = vi.mocked(prisma.projectCheckpoint.findUnique).mock.calls[0];
		expect((args as { select: { _count: unknown } }).select._count).toEqual({
			select: { items: { where: { kind: "Input" } } },
		});
	});

	it("refuses a checkpoint that has already been paid for", async () => {
		vi.mocked(prisma.payment.findFirst).mockResolvedValue({ id: "pay1" } as never);

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

describe("while a checkpoint with an expert is a waitlist", () => {
	it("refuses to sell one", async () => {
		expert.open = false;
		await expect(checkpointCheckout("cp1")).resolves.toEqual({
			ok: false,
			reason: "expertClosed",
		});
	});

	it("still sells the AI curator", async () => {
		expert.open = false;
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
			checkpoint({ curatorKind: CheckpointCuratorKind.AI, curatorId: null }) as never,
		);
		expect((await checkpointCheckout("cp1")).ok).toBe(true);
	});
});

// A decline, the holds cron and a curator's yes can all reach one checkpoint
// at once: only the one that finds it still waiting may hand it back.
describe("handing a checkpoint back to its author", () => {
	it("makes it a draft again and lets that curator's calls go", async () => {
		vi.mocked(prisma.projectCheckpoint.updateMany).mockResolvedValue({
			count: 1,
		});

		await expect(returnToAuthor("cp1", "u9")).resolves.toBe(true);

		expect(prisma.projectCheckpoint.updateMany).toHaveBeenCalledWith({
			where: {
				id: "cp1",
				status: { in: [CheckpointStatus.AwaitingCurator] },
			},
			data: expect.objectContaining({
				status: CheckpointStatus.Draft,
				curatorId: null,
				paymentId: null,
				declinedCuratorIds: { push: "u9" },
			}),
		});
		expect(prisma.checkpointSession.deleteMany).toHaveBeenCalledWith({
			where: { checkpointId: "cp1" },
		});
	});

	it("leaves a checkpoint that stopped waiting, and its calls, alone", async () => {
		vi.mocked(prisma.projectCheckpoint.updateMany).mockResolvedValue({
			count: 0,
		});

		await expect(returnToAuthor("cp1", "u9")).resolves.toBe(false);

		expect(prisma.checkpointSession.deleteMany).not.toHaveBeenCalled();
	});
});
