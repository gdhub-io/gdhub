import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	bookSessions,
	isFirstCallFree,
} from "@/repositories/advisor-availability";
import { prisma } from "@/services/prisma";

const authMock = vi.fn();
const checkpointFindUnique = vi.fn();
const checkpointUpdate = vi.fn();
const specialityFindFirst = vi.fn();
const paymentCount = vi.fn();
const paymentFindFirst = vi.fn();
const getCheckpoint = vi.fn();

vi.mock("@/auth", () => ({ auth: () => authMock() }));

// Covered by space-guard.test.ts; mocked here so the assertions are about the
// draft rather than about access resolution.
vi.mock("@/lib/space-guard", () => ({
	withSpaceGuard: () => (handler: unknown) => handler,
}));

vi.mock("@/repositories/checkpoint.repository", () => ({
	getCheckpoint: (...args: unknown[]) => getCheckpoint(...args),
	withProgress: <T>(checkpoint: T) => checkpoint,
	replaceCheckpointItems: vi.fn(),
}));

vi.mock("@/repositories/advisor-availability", () => ({
	isFirstCallFree: vi.fn(async () => true),
	bookSessions: vi.fn(async () => undefined),
	SlotTakenError: class SlotTakenError extends Error {},
}));

vi.mock("@/services/prisma", () => ({
	prisma: {
		$transaction: vi.fn(),
		checkpointSession: { deleteMany: vi.fn() },
		projectCheckpoint: {
			findUnique: (...args: unknown[]) => checkpointFindUnique(...args),
			update: (...args: unknown[]) => checkpointUpdate(...args),
		},
		speciality: {
			findFirst: (...args: unknown[]) => specialityFindFirst(...args),
		},
		payment: {
			count: (...args: unknown[]) => paymentCount(...args),
			findFirst: (...args: unknown[]) => paymentFindFirst(...args),
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
	vi.mocked(prisma.$transaction).mockImplementation((async (arg: unknown) =>
		typeof arg === "function"
			? (arg as (tx: typeof prisma) => unknown)(prisma)
			: Promise.all(arg as unknown[])) as never);
	vi.clearAllMocks();
	authMock.mockResolvedValue({ user: author });
	checkpointFindUnique.mockResolvedValue({ status: "Draft" });
	checkpointUpdate.mockResolvedValue({});
	specialityFindFirst.mockResolvedValue({ id: "sp1" });
	paymentCount.mockResolvedValue(0);
	paymentFindFirst.mockResolvedValue(null);
	getCheckpoint.mockResolvedValue({ id: "cp1" });
});

describe("PUT /api/checkpoint/[id] — the day it starts", () => {
	it("stores the day and the date it runs to, rather than trusting both", async () => {
		const response = await put({ startedAt: "2026-09-10" });

		expect(response.status).toBe(200);
		const { data } = checkpointUpdate.mock.calls[0][0];
		expect(data.startedAt.toISOString()).toBe("2026-09-10T00:00:00.000Z");
		// Day 1 is the start, so the 28th day is 27 days later — computed here so
		// a browser cannot send a pair that disagrees.
		expect(data.dueAt.toISOString()).toBe("2026-10-07T00:00:00.000Z");
	});

	it("lets the day be taken back off a draft", async () => {
		await put({ startedAt: null });

		expect(checkpointUpdate.mock.calls[0][0].data).toMatchObject({
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
		expect(checkpointUpdate).not.toHaveBeenCalled();
	});

	it("refuses the author as the curator of their own checkpoint", async () => {
		const response = await put({ curatorKind: "Human", curatorId: author.id });

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toMatchObject({
			error: "curatorIsAuthor",
		});
		expect(checkpointUpdate).not.toHaveBeenCalled();
	});

	it("accepts one who has, and writes them onto the draft", async () => {
		const response = await put({ curatorKind: "Human", curatorId: "u9" });

		expect(response.status).toBe(200);
		// The level floor the list applies: Experienced or Expert, nobody below.
		expect(specialityFindFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					userId: "u9",
					isOpenForMentoring: true,
					level: { in: ["Experienced", "Expert"] },
				},
			}),
		);
		expect(checkpointUpdate.mock.calls[0][0].data).toMatchObject({
			curatorKind: "Human",
			curatorId: "u9",
		});
	});

	// A curator who declined leaves the checkpoint paid for and back in Draft.
	// Naming someone else hands it to them; asking the author to pay twice for
	// the same 28 days is the bug this guards.
	it("sends a paid checkpoint to the curator picked next, unpaid again", async () => {
		paymentCount.mockResolvedValue(1);
		paymentFindFirst.mockResolvedValue({ amount: 45000 });
		specialityFindFirst.mockResolvedValue({ id: "sp1", level: "Expert" });

		await put({ curatorKind: "Human", curatorId: "u9" });

		expect(checkpointUpdate.mock.calls[0][0].data).toMatchObject({
			status: "AwaitingCurator",
			curatorId: "u9",
		});
	});

	it("leaves an unpaid draft a draft when its curator changes", async () => {
		await put({ curatorKind: "Human", curatorId: "u9" });

		expect(checkpointUpdate.mock.calls[0][0].data.status).toBeUndefined();
	});

	// The way out of a curator who declined or went quiet. Everything else about
	// a paid checkpoint is settled, so only this one field may move.
	it("lets a waiting checkpoint be handed to somebody else", async () => {
		checkpointFindUnique.mockResolvedValue({ status: "AwaitingCurator" });
		paymentCount.mockResolvedValue(1);
		paymentFindFirst.mockResolvedValue({ amount: 45000 });
		specialityFindFirst.mockResolvedValue({ id: "sp1", level: "Expert" });

		const response = await put({
			curatorKind: "Human",
			curatorId: "u9",
			startedAt: "2026-10-21T09:00:00.000Z",
		});

		expect(response.status).toBe(200);
		expect(checkpointUpdate.mock.calls[0][0].data).toMatchObject({
			status: "AwaitingCurator",
			curatorId: "u9",
		});
		// The money is held already, so the new curator's calls are booked now.
		expect(bookSessions).toHaveBeenCalledWith(prisma, "cp1");
	});

	// While it waits the money is only held, not taken: the new curator's
	// calls are booked all the same.
	it("books the new curator's calls on a checkpoint waiting on a hold", async () => {
		checkpointFindUnique.mockResolvedValue({ status: "AwaitingCurator" });
		paymentCount.mockResolvedValue(0);
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
		expect(checkpointUpdate).not.toHaveBeenCalled();
	});

	// A first call is booked in one curator's hours; with another it means nothing.
	it("lets the first call go when the curator changes", async () => {
		specialityFindFirst.mockResolvedValue({ id: "sp1", level: "Expert" });

		await put({ curatorKind: "Human", curatorId: "u9" });

		expect(checkpointUpdate.mock.calls[0][0].data).toMatchObject({
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
		expect(checkpointUpdate).not.toHaveBeenCalled();
	});

	it("refuses the AI curator in place of a person already paid for", async () => {
		checkpointFindUnique.mockResolvedValue({ status: "AwaitingCurator" });
		paymentFindFirst.mockResolvedValue({ amount: 45000 });

		const response = await put({ curatorKind: "AI", curatorId: null });

		expect(response.status).toBe(400);
		expect(checkpointUpdate).not.toHaveBeenCalled();
	});

	it("refuses to rewrite anything else on a waiting checkpoint", async () => {
		checkpointFindUnique.mockResolvedValue({ status: "AwaitingCurator" });

		const response = await put({ goal: "Something else entirely" });

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toMatchObject({
			error: "checkpointNotDraft",
		});
		expect(checkpointUpdate).not.toHaveBeenCalled();
	});

	it("lets the person go when the AI curator is chosen", async () => {
		await put({ curatorKind: "AI", curatorId: null });

		expect(checkpointUpdate.mock.calls[0][0].data).toMatchObject({
			curatorKind: "AI",
			curatorId: null,
		});
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
