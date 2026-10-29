import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	CHECKPOINT_AI_PRICE,
	CHECKPOINT_MINOR_UNITS,
} from "@/config/checkpoint";
import {
	bookSessions,
	isFirstCallFree,
} from "@/repositories/advisor-availability";
import { prisma } from "@/services/prisma";

const authMock = vi.fn();
const checkpointFindUnique = vi.fn();
const checkpointFindUniqueOrThrow = vi.fn();
const checkpointUpdateMany = vi.fn();
const sessionDeleteMany = vi.fn();
const sessionCreateMany = vi.fn();
const specialityFindFirst = vi.fn();
// The payment that bought the checkpoint (`completedPaymentOf`), apart from the
// money it holds or took (`heldAmount`): a hold is not a purchase.
const completedPaymentFindFirst = vi.fn();
const paymentFindFirst = vi.fn();
const getCheckpoint = vi.fn();
const writeFirstLetter = vi.fn();

// The expert path is tested as it will run once open; `expert.open = false` tests the waitlist.
const expert = vi.hoisted(() => ({ open: true }));
vi.mock("@/config/checkpoint", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/config/checkpoint")>()),
	get EXPERT_CHECKPOINT_OPEN() {
		return expert.open;
	},
}));

vi.mock("@/auth", () => ({ auth: () => authMock() }));

// Covered by space-guard.test.ts; mocked here so the assertions are about the
// draft rather than about access resolution.
vi.mock("@/lib/space-guard", () => ({
	withSpaceGuard: () => (handler: unknown) => handler,
}));

vi.mock("@/repositories/checkpoints/checkpoint", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/repositories/checkpoints/checkpoint")>()),
	withProgress: <T>(checkpoint: T) => checkpoint,
	replaceCheckpointItems: vi.fn(),
}));
vi.mock("@/repositories/checkpoints/detail", () => ({
	getCheckpoint: (...args: unknown[]) => getCheckpoint(...args),
}));

vi.mock("@/services/checkpoints/flows/ai-curator", () => ({
	writeFirstLetter: (...args: unknown[]) => writeFirstLetter(...args),
}));

vi.mock("@/repositories/advisor-availability", () => ({
	isFirstCallFree: vi.fn(async () => true),
	bookSessions: vi.fn(async () => undefined),
	SlotTakenError: class SlotTakenError extends Error {},
}));

vi.mock("@/services/prisma", () => ({
	prisma: {
		$transaction: vi.fn(),
		checkpointSession: {
			deleteMany: (...args: unknown[]) => sessionDeleteMany(...args),
			createMany: (...args: unknown[]) => sessionCreateMany(...args),
		},
		projectCheckpoint: {
			findUnique: (...args: unknown[]) => checkpointFindUnique(...args),
			findUniqueOrThrow: (...args: unknown[]) =>
				checkpointFindUniqueOrThrow(...args),
			updateMany: (...args: unknown[]) => checkpointUpdateMany(...args),
		},
		speciality: {
			findFirst: (...args: unknown[]) => specialityFindFirst(...args),
		},
		payment: {
			findFirst: (args: { where: { status?: unknown } }) =>
				args.where.status === "COMPLETED"
					? completedPaymentFindFirst(args)
					: paymentFindFirst(args),
		},
	},
}));

const author = { id: "u1", roles: ["Member"], onboardingDone: true };

const put = async (body: unknown) => {
	const { PUT } = await import("@/app/api/checkpoint/[id]/route");
	const request = new NextRequest("http://localhost/api/checkpoint/cp1", {
		method: "PUT",
		body: JSON.stringify(body),
		headers: { "content-type": "application/json" },
	});

	return (PUT as (r: NextRequest, c: unknown) => Promise<Response>)(request, {
		params: Promise.resolve({ id: "cp1" }),
	});
};

beforeEach(() => {
	expert.open = true;
	vi.mocked(prisma.$transaction).mockImplementation((async (arg: unknown) =>
		typeof arg === "function"
			? (arg as (tx: typeof prisma) => unknown)(prisma)
			: Promise.all(arg as unknown[])) as never);
	vi.clearAllMocks();
	authMock.mockResolvedValue({ user: author });
	checkpointFindUnique.mockResolvedValue({ status: "Draft" });
	checkpointUpdateMany.mockResolvedValue({ count: 1 });
	checkpointFindUniqueOrThrow.mockResolvedValue({ startedAt: null });
	specialityFindFirst.mockResolvedValue({ id: "sp1" });
	completedPaymentFindFirst.mockResolvedValue(null);
	paymentFindFirst.mockResolvedValue(null);
	getCheckpoint.mockResolvedValue({ id: "cp1" });
});

describe("PUT /api/checkpoint/[id] — the day it starts", () => {
	it("stores the day and the date it runs to, rather than trusting both", async () => {
		const response = await put({ startedAt: "2026-09-10" });

		expect(response.status).toBe(200);
		const { data } = checkpointUpdateMany.mock.calls[0][0];
		expect(data.startedAt.toISOString()).toBe("2026-09-10T00:00:00.000Z");
		// Day 1 is the start, so the 28th day is 27 days later — computed here so
		// a browser cannot send a pair that disagrees.
		expect(data.dueAt.toISOString()).toBe("2026-10-07T00:00:00.000Z");
	});

	it("lets the day be taken back off a draft", async () => {
		await put({ startedAt: null });

		expect(checkpointUpdateMany.mock.calls[0][0].data).toMatchObject({
			startedAt: null,
			dueAt: null,
		});
	});
});

describe("PUT /api/checkpoint/[id] — who runs it", () => {
	it("refuses a curator who has not said they take mentees", async () => {
		specialityFindFirst.mockResolvedValue(null);

		const response = await put({ curatorKind: "Human", curatorId: "u9" });

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toMatchObject({
			error: "curatorNotOpenForMentoring",
		});
		expect(checkpointUpdateMany).not.toHaveBeenCalled();
	});

	it("refuses the author as the curator of their own checkpoint", async () => {
		const response = await put({ curatorKind: "Human", curatorId: author.id });

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toMatchObject({
			error: "curatorIsAuthor",
		});
		expect(checkpointUpdateMany).not.toHaveBeenCalled();
	});

	it("accepts one who has, and writes them onto the draft", async () => {
		const response = await put({ curatorKind: "Human", curatorId: "u9" });

		expect(response.status).toBe(200);
		// The level floor the list applies, and only a curator an admin approved.
		expect(specialityFindFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					userId: "u9",
					isOpenForMentoring: true,
					level: { in: ["Experienced", "Expert"] },
					user: {
						expertProfile: expect.objectContaining({
							curation: true,
							curatorApprovedAt: { not: null },
						}),
					},
				}),
			}),
		);
		expect(checkpointUpdateMany.mock.calls[0][0].data).toMatchObject({
			curatorKind: "Human",
			curatorId: "u9",
		});
	});

	// A curator who declined leaves the checkpoint paid for and back in Draft.
	// Naming someone else hands it to them; asking the author to pay twice for
	// the same 28 days is the bug this guards.
	it("sends a paid checkpoint to the curator picked next, unpaid again", async () => {
		completedPaymentFindFirst.mockResolvedValue({ id: "pay1" });
		paymentFindFirst.mockResolvedValue({ amount: 45000 });
		specialityFindFirst.mockResolvedValue({ id: "sp1", level: "Expert" });

		await put({ curatorKind: "Human", curatorId: "u9" });

		// Only a draft is sent on: a write racing another move changes nothing.
		expect(checkpointUpdateMany.mock.calls[0][0].where).toEqual({
			id: "cp1",
			status: { in: ["Draft"] },
		});
		expect(checkpointUpdateMany.mock.calls[0][0].data).toMatchObject({
			status: "AwaitingCurator",
			curatorId: "u9",
		});
		expect(bookSessions).toHaveBeenCalledWith(prisma, "cp1");
	});

	it("books nobody when the paid draft moved on meanwhile", async () => {
		completedPaymentFindFirst.mockResolvedValue({ id: "pay1" });
		paymentFindFirst.mockResolvedValue({ amount: 45000 });
		specialityFindFirst.mockResolvedValue({ id: "sp1", level: "Expert" });
		checkpointUpdateMany.mockResolvedValue({ count: 0 });

		const response = await put({ curatorKind: "Human", curatorId: "u9" });

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toMatchObject({
			error: "checkpointNotDraft",
		});
		expect(bookSessions).not.toHaveBeenCalled();
	});

	// Naming the AI on a paid draft starts it exactly as paying for the AI does:
	// its review days written and its first letter sent, not just a status flipped.
	it("starts a paid draft handed to the AI the way a payment starts it", async () => {
		const aiPrice = CHECKPOINT_AI_PRICE * CHECKPOINT_MINOR_UNITS;
		completedPaymentFindFirst.mockResolvedValue({ id: "pay1" });
		paymentFindFirst.mockResolvedValue({ amount: aiPrice });

		const response = await put({ curatorKind: "AI", curatorId: null });

		expect(response.status).toBe(200);
		const [fields, start] = checkpointUpdateMany.mock.calls.map(
			([args]) => args,
		);
		// The pick is written without touching the status, while it is still the draft read...
		expect(fields.where).toEqual({ id: "cp1", status: "Draft" });
		expect(fields.data).toMatchObject({ curatorKind: "AI", curatorId: null });
		expect(fields.data.status).toBeUndefined();
		// ...and only the guarded move makes it Active, with the payment on it.
		expect(start.where).toEqual({
			id: "cp1",
			status: { in: ["Draft", "AwaitingCurator"] },
		});
		expect(start.data).toMatchObject({ status: "Active", paymentId: "pay1" });
		expect(sessionDeleteMany).toHaveBeenCalledWith({
			where: { checkpointId: "cp1" },
		});
		expect(sessionCreateMany.mock.calls[0][0].data).toHaveLength(5);
		await vi.waitFor(() => expect(writeFirstLetter).toHaveBeenCalledWith("cp1"));
	});

	it("refuses the AI on a paid draft that started meanwhile", async () => {
		completedPaymentFindFirst.mockResolvedValue({ id: "pay1" });
		paymentFindFirst.mockResolvedValue({ amount: CHECKPOINT_AI_PRICE * CHECKPOINT_MINOR_UNITS });
		checkpointUpdateMany
			.mockResolvedValueOnce({ count: 1 })
			.mockResolvedValueOnce({ count: 0 });

		const response = await put({ curatorKind: "AI", curatorId: null });

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toMatchObject({
			error: "checkpointNotDraft",
		});
		expect(sessionCreateMany).not.toHaveBeenCalled();
	});

	it("leaves an unpaid draft a draft when its curator changes", async () => {
		await put({ curatorKind: "Human", curatorId: "u9" });

		expect(checkpointUpdateMany.mock.calls[0][0].where).toEqual({
			id: "cp1",
			status: "Draft",
		});
		expect(checkpointUpdateMany.mock.calls[0][0].data.status).toBeUndefined();
	});

	// The way out of a curator who declined or went quiet. Everything else about
	// a paid checkpoint is settled, so only this one field may move.
	it("lets a waiting checkpoint be handed to somebody else", async () => {
		checkpointFindUnique.mockResolvedValue({ status: "AwaitingCurator" });
		completedPaymentFindFirst.mockResolvedValue({ id: "pay1" });
		paymentFindFirst.mockResolvedValue({ amount: 45000 });
		specialityFindFirst.mockResolvedValue({ id: "sp1", level: "Expert" });

		const response = await put({
			curatorKind: "Human",
			curatorId: "u9",
			startedAt: "2026-10-21T09:00:00.000Z",
		});

		expect(response.status).toBe(200);
		// Already AwaitingCurator: it stays so, only the curator is rewritten.
		expect(checkpointUpdateMany.mock.calls[0][0].data).toMatchObject({
			curatorId: "u9",
		});
		expect(checkpointUpdateMany.mock.calls[0][0].data.status).toBeUndefined();
		// The money is held already, so the new curator's calls are booked now.
		expect(bookSessions).toHaveBeenCalledWith(prisma, "cp1");
	});

	// While it waits the money is only held, not taken: the new curator's
	// calls are booked all the same.
	it("books the new curator's calls on a checkpoint waiting on a hold", async () => {
		checkpointFindUnique.mockResolvedValue({ status: "AwaitingCurator" });
		completedPaymentFindFirst.mockResolvedValue(null);
		specialityFindFirst.mockResolvedValue({ id: "sp1", level: "Expert" });

		const response = await put({
			curatorKind: "Human",
			curatorId: "u9",
			startedAt: "2026-10-20T14:00:00.000Z",
		});

		expect(response.status).toBe(200);
		expect(bookSessions).toHaveBeenCalledWith(prisma, "cp1");
	});

	it("refuses a first call that no longer opens a free series", async () => {
		specialityFindFirst.mockResolvedValue({ id: "sp1", level: "Expert" });
		vi.mocked(isFirstCallFree).mockResolvedValueOnce(false);

		const response = await put({
			curatorKind: "Human",
			curatorId: "u9",
			startedAt: "2026-10-21T09:00:00.000Z",
		});

		expect(response.status).toBe(400);
		expect(checkpointUpdateMany).not.toHaveBeenCalled();
	});

	// A first call is booked in one curator's hours; with another it means nothing.
	it("lets the first call go when the curator changes", async () => {
		specialityFindFirst.mockResolvedValue({ id: "sp1", level: "Expert" });

		await put({ curatorKind: "Human", curatorId: "u9" });

		expect(checkpointUpdateMany.mock.calls[0][0].data).toMatchObject({
			startedAt: null,
			dueAt: null,
		});
	});

	// The money held buys one price. A dearer curator would need a top-up and a
	// cheaper one a partial refund; until either exists, both are refused.
	it("refuses a replacement who costs other than what is held", async () => {
		checkpointFindUnique.mockResolvedValue({ status: "AwaitingCurator" });
		paymentFindFirst.mockResolvedValue({ amount: 30000 });
		specialityFindFirst.mockResolvedValue({ id: "sp1", level: "Expert" });

		const response = await put({ curatorKind: "Human", curatorId: "u9" });

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toMatchObject({
			error: "curatorPriceDiffers",
		});
		expect(checkpointUpdateMany).not.toHaveBeenCalled();
	});

	it("refuses the AI curator in place of a person already paid for", async () => {
		checkpointFindUnique.mockResolvedValue({ status: "AwaitingCurator" });
		paymentFindFirst.mockResolvedValue({ amount: 45000 });

		const response = await put({ curatorKind: "AI", curatorId: null });

		expect(response.status).toBe(400);
		expect(checkpointUpdateMany).not.toHaveBeenCalled();
	});

	it("refuses to rewrite anything else on a waiting checkpoint", async () => {
		checkpointFindUnique.mockResolvedValue({ status: "AwaitingCurator" });

		const response = await put({ goal: "Something else entirely" });

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toMatchObject({
			error: "checkpointNotDraft",
		});
		expect(checkpointUpdateMany).not.toHaveBeenCalled();
	});

	it("lets the person go when the AI curator is chosen", async () => {
		await put({ curatorKind: "AI", curatorId: null });

		expect(checkpointUpdateMany.mock.calls[0][0].data).toMatchObject({
			curatorKind: "AI",
			curatorId: null,
		});
		// Unpaid: picking the AI starts nothing.
		expect(checkpointUpdateMany).toHaveBeenCalledTimes(1);
		expect(sessionCreateMany).not.toHaveBeenCalled();
	});

	it("refuses to touch a checkpoint that has been bought", async () => {
		checkpointFindUnique.mockResolvedValue({ status: "Active" });

		const response = await put({ goal: "A new goal" });

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toMatchObject({
			error: "checkpointNotDraft",
		});
	});
});

describe("PUT /api/checkpoint/[id] — while an expert is a waitlist", () => {
	it("refuses to put an expert on an unpaid draft", async () => {
		expert.open = false;

		const response = await put({ curatorKind: "Human", curatorId: "u9" });

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toMatchObject({
			error: "expertClosed",
		});
		expect(checkpointUpdateMany).not.toHaveBeenCalled();
	});

	// A curator who declined a paid checkpoint must still be replaceable.
	it("still lets a paid draft go to another expert", async () => {
		expert.open = false;
		completedPaymentFindFirst.mockResolvedValue({ id: "pay1" });
		paymentFindFirst.mockResolvedValue({ amount: 45000 });
		specialityFindFirst.mockResolvedValue({ id: "sp1", level: "Expert" });

		const response = await put({ curatorKind: "Human", curatorId: "u9" });

		expect(response.status).toBe(200);
	});
});
