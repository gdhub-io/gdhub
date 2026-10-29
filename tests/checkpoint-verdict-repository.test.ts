import {
	CheckpointCuratorKind,
	CheckpointStatus,
	CheckpointVerdict,
} from "@gdhub-io/gdhub-prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { journalCuratorVerdict } from "@/repositories/checkpoints/ai-curator";
import { saveVerdictDraft } from "@/repositories/checkpoints/verdict";
import { closeCheckpointRoom } from "@/services/chat/checkpoint-room";
import { moveFinishedToReview, writeCuratorVerdict } from "@/services/checkpoints/flows/verdict";
import {
	notifyVerdictDue,
	notifyVerdictSent,
} from "@/services/checkpoints/verdict-notifications";
import { prisma } from "@/services/prisma";

vi.mock("@/services/prisma", () => ({
	prisma: {
		projectCheckpoint: {
			findFirst: vi.fn(),
			updateMany: vi.fn(),
			updateManyAndReturn: vi.fn(),
		},
	},
}));

vi.mock("@/services/chat/checkpoint-room", () => ({
	closeCheckpointRoom: vi.fn(),
	syncChat: (_label: string, run: () => Promise<unknown>) => run(),
}));

vi.mock("@/repositories/checkpoints/ai-curator", () => ({
	getVerdictRead: vi.fn(async () => null),
	journalCuratorVerdict: vi.fn(),
}));

vi.mock("@/services/checkpoints/verdict-notifications", () => ({
	notifyVerdictDue: vi.fn(),
	notifyVerdictSent: vi.fn(),
}));

const startedAt = new Date("2026-09-01T09:00:00.000Z");
const finalCall = {
	scheduledAt: new Date("2026-09-29T15:00:00.000Z"),
	curatorJoinedAt: null,
};
const beforeCall = new Date("2026-09-29T10:00:00.000Z");
const afterCall = new Date("2026-09-29T16:00:00.000Z");

const row = (over: Record<string, unknown> = {}) => ({
	status: CheckpointStatus.Review,
	verdict: null,
	startedAt,
	sessions: [finalCall],
	...over,
});

const body = { verdict: CheckpointVerdict.GoalMissed, note: "Two of three." };

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(prisma.projectCheckpoint.updateMany).mockResolvedValue({
		count: 1,
	});
});

describe("writeCuratorVerdict", () => {
	it("looks the checkpoint up by its own human curator only", async () => {
		vi.mocked(prisma.projectCheckpoint.findFirst).mockResolvedValue(null);

		await expect(
			writeCuratorVerdict("cp1", "someone-else", body, afterCall),
		).resolves.toEqual({ ok: false, reason: "notFound" });
		expect(prisma.projectCheckpoint.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					id: "cp1",
					curatorId: "someone-else",
					curatorKind: CheckpointCuratorKind.Human,
				},
			}),
		);
	});

	it("refuses before the final call starts, even on its day", async () => {
		vi.mocked(prisma.projectCheckpoint.findFirst).mockResolvedValue(
			row() as never,
		);

		await expect(
			writeCuratorVerdict("cp1", "u1", body, beforeCall),
		).resolves.toEqual({ ok: false, reason: "notOpen" });
		expect(prisma.projectCheckpoint.updateMany).not.toHaveBeenCalled();
	});

	it("refuses a second verdict", async () => {
		vi.mocked(prisma.projectCheckpoint.findFirst).mockResolvedValue(
			row({ verdict: CheckpointVerdict.GoalMet }) as never,
		);

		await expect(
			writeCuratorVerdict("cp1", "u1", body, afterCall),
		).resolves.toEqual({ ok: false, reason: "alreadyDecided" });
	});

	it("loses a race to the other submit without closing anything twice", async () => {
		vi.mocked(prisma.projectCheckpoint.findFirst).mockResolvedValue(
			row() as never,
		);
		vi.mocked(prisma.projectCheckpoint.updateMany).mockResolvedValue({
			count: 0,
		});

		await expect(
			writeCuratorVerdict("cp1", "u1", body, afterCall),
		).resolves.toEqual({ ok: false, reason: "alreadyDecided" });
		expect(closeCheckpointRoom).not.toHaveBeenCalled();
		expect(notifyVerdictSent).not.toHaveBeenCalled();
	});

	it("closes the checkpoint, clears the draft, closes the chat and tells the author", async () => {
		vi.mocked(prisma.projectCheckpoint.findFirst).mockResolvedValue(
			row() as never,
		);

		await expect(
			writeCuratorVerdict("cp1", "u1", body, afterCall),
		).resolves.toEqual({ ok: true });

		const update = vi.mocked(prisma.projectCheckpoint.updateMany).mock
			.calls[0][0];
		expect(update.where).toMatchObject({
			id: "cp1",
			curatorId: "u1",
			verdict: null,
		});
		expect(update.data).toMatchObject({
			status: CheckpointStatus.Closed,
			verdict: CheckpointVerdict.GoalMissed,
			verdictNote: "Two of three.",
			decidedById: "u1",
			verdictDraft: null,
			verdictDraftNote: null,
		});
		expect(closeCheckpointRoom).toHaveBeenCalledWith("cp1");
		expect(notifyVerdictSent).toHaveBeenCalledWith("cp1");
		// Admins see it beside what the AI would have proposed.
		expect(journalCuratorVerdict).toHaveBeenCalledWith(
			"cp1",
			CheckpointVerdict.GoalMissed,
			"Two of three.",
		);
	});

	it("does not care which verdict the evidence would suggest", async () => {
		vi.mocked(prisma.projectCheckpoint.findFirst).mockResolvedValue(
			row() as never,
		);

		await expect(
			writeCuratorVerdict(
				"cp1",
				"u1",
				{ verdict: CheckpointVerdict.StageClosed, note: "Ready." },
				afterCall,
			),
		).resolves.toEqual({ ok: true });
	});
});

describe("saveVerdictDraft", () => {
	it("refuses before sprint 4", async () => {
		vi.mocked(prisma.projectCheckpoint.findFirst).mockResolvedValue(
			row({ status: CheckpointStatus.Active }) as never,
		);

		await expect(
			saveVerdictDraft(
				"cp1",
				"u1",
				{ verdict: null, note: "" },
				new Date("2026-09-20T12:00:00.000Z"),
			),
		).resolves.toEqual({ ok: false, reason: "notOpen" });
	});

	it("saves during sprint 4 without touching the verdict itself", async () => {
		vi.mocked(prisma.projectCheckpoint.findFirst).mockResolvedValue(
			row({ status: CheckpointStatus.Active }) as never,
		);

		await expect(
			saveVerdictDraft(
				"cp1",
				"u1",
				{ verdict: CheckpointVerdict.GoalMet, note: "So far" },
				new Date("2026-09-24T12:00:00.000Z"),
			),
		).resolves.toEqual({ ok: true });

		const { data } = vi.mocked(prisma.projectCheckpoint.updateMany).mock
			.calls[0][0];
		expect(data).toEqual({
			verdictDraft: CheckpointVerdict.GoalMet,
			verdictDraftNote: "So far",
			verdictDraftAt: new Date("2026-09-24T12:00:00.000Z"),
		});
	});
});

describe("moveFinishedToReview", () => {
	it("moves what ended before today and tells only the human curators", async () => {
		vi.mocked(prisma.projectCheckpoint.updateManyAndReturn).mockResolvedValue([
			{ id: "h1", curatorKind: CheckpointCuratorKind.Human },
			{ id: "a1", curatorKind: CheckpointCuratorKind.AI },
		] as never);

		await expect(
			moveFinishedToReview(new Date("2026-09-29T01:00:00.000Z")),
		).resolves.toBe(2);

		expect(
			vi.mocked(prisma.projectCheckpoint.updateManyAndReturn).mock.calls[0][0]
				.where,
		).toEqual({
			status: { in: [CheckpointStatus.Active] },
			dueAt: { lt: new Date("2026-09-29T00:00:00.000Z") },
		});
		expect(notifyVerdictDue).toHaveBeenCalledWith(["h1"]);
	});
});
