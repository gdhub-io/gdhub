import { CheckpointVerdict, Prisma } from "@gdhub-io/gdhub-prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	feedbackFor,
	rateCheckpoint,
} from "@/repositories/checkpoint-feedback";
import { averageRating } from "@/repositories/checkpoint-payouts";
import { prisma } from "@/services/prisma";

vi.mock("@/services/prisma", () => ({
	prisma: {
		payment: { findFirst: vi.fn() },
		projectCheckpoint: { findUnique: vi.fn() },
		checkpointFeedback: { findUnique: vi.fn(), create: vi.fn() },
	},
}));
vi.mock("@/services/checkpoint-notifications", () => ({
	notify: vi.fn(),
	appUrl: () => "",
}));
vi.mock("@/repositories/checkpoint-number", () => ({ checkpointNumber: vi.fn() }));

const closed = {
	verdict: CheckpointVerdict.GoalMet,
	project: { authorId: "author" },
};
const saved = {
	rating: 4,
	comment: "Fair",
	createdAt: new Date("2026-10-20T10:00:00.000Z"),
};

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(closed as never);
	vi.mocked(prisma.payment.findFirst).mockResolvedValue({ payerId: "buyer" } as never);
	vi.mocked(prisma.checkpointFeedback.findUnique).mockResolvedValue(null);
	vi.mocked(prisma.checkpointFeedback.create).mockResolvedValue(saved as never);
});

describe("rating an assessment", () => {
	it("is the buyer's alone — not the project's author, not the team", async () => {
		await expect(
			rateCheckpoint("cp1", "author", { rating: 5 }),
		).resolves.toEqual({ ok: false, error: "notRater" });
		await expect(feedbackFor("cp1", "teammate")).resolves.toBeNull();

		await expect(
			rateCheckpoint("cp1", "buyer", { rating: 4, comment: " Fair " }),
		).resolves.toMatchObject({ ok: true, feedback: { rating: 4 } });
		expect(prisma.checkpointFeedback.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: { checkpointId: "cp1", authorId: "buyer", rating: 4, comment: "Fair" },
			}),
		);
	});

	it("falls to the project's author when an admin gave the checkpoint away", async () => {
		vi.mocked(prisma.payment.findFirst).mockResolvedValue(null);

		await expect(
			rateCheckpoint("cp1", "author", { rating: 3 }),
		).resolves.toMatchObject({ ok: true });
	});

	it("is final: a second send keeps the first", async () => {
		vi.mocked(prisma.checkpointFeedback.create).mockRejectedValue(
			new Prisma.PrismaClientKnownRequestError("unique", {
				code: "P2002",
				clientVersion: "test",
			}),
		);
		vi.mocked(prisma.checkpointFeedback.findUnique).mockResolvedValue(saved as never);

		await expect(
			rateCheckpoint("cp1", "buyer", { rating: 1 }),
		).resolves.toMatchObject({
			ok: false,
			error: "alreadyRated",
			feedback: { rating: 4 },
		});
	});

	it("shows the rater what they sent, read with the checkpoint", async () => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue({
			...closed,
			feedback: saved,
		} as never);

		await expect(feedbackFor("cp1", "buyer")).resolves.toEqual({
			feedback: { rating: 4, comment: "Fair", createdAt: "2026-10-20T10:00:00.000Z" },
		});
		expect(prisma.checkpointFeedback.findUnique).not.toHaveBeenCalled();
	});

	it("waits for the verdict", async () => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue({
			...closed,
			verdict: null,
		} as never);

		await expect(
			rateCheckpoint("cp1", "buyer", { rating: 4 }),
		).resolves.toEqual({ ok: false, error: "noVerdict" });
	});
});

describe("a curator's average", () => {
	it("is held back below five answers, one decimal above", () => {
		expect(averageRating([5, 4, 5])).toEqual({ count: 3, average: null });
		expect(averageRating([5, 4, 5, 4, 5])).toEqual({ count: 5, average: 4.6 });
	});
});
