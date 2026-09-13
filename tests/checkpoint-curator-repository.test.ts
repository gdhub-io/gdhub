import {
	CheckpointItemKind,
	CheckpointStatus,
	CheckpointVerdict,
} from "@gdhub-io/gdhub-prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	answerDevlog,
	closeCheckpoint,
	writeMidNote,
} from "@/repositories/checkpoint-curator.repository";
import { checkpointCurator } from "@/services/checkpoint-curator";
import { prisma } from "@/services/prisma";

vi.mock("@/services/prisma", () => ({
	prisma: {
		projectCheckpoint: { findUnique: vi.fn(), update: vi.fn() },
		projectReport: { findUnique: vi.fn(), update: vi.fn() },
		projectWorkflowTask: { findMany: vi.fn().mockResolvedValue([]) },
	},
}));

vi.mock("@/services/checkpoint-curator", () => ({
	checkpointCurator: {
		checkGoal: vi.fn(),
		answerDevlog: vi.fn(),
		writeMidNote: vi.fn(),
		writeReport: vi.fn(),
	},
}));

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(prisma.projectWorkflowTask.findMany).mockResolvedValue([] as never);
});

const outcome = (id: string, artifact: unknown = null) => ({
	id,
	kind: CheckpointItemKind.Outcome,
	text: `outcome ${id}`,
	originalText: null,
	cut: false,
	addedAt: null,
	acceptedNote: null,
	artifact,
});

const readable = {
	type: "GameplayVideo",
	name: "Slice",
	description: null,
	link: "https://example.com/v",
	checkStatus: "Readable",
};

const running = (over: Record<string, unknown> = {}) => ({
	goal: "A playable vertical slice",
	stageName: "Prototyping",
	stepId: "step-1",
	status: CheckpointStatus.Active,
	verdict: null,
	midNote: null,
	revisedAt: null,
	revisedNote: null,
	startedAt: new Date("2026-09-01T00:00:00.000Z"),
	items: [outcome("o1", readable)],
	reports: [],
	pulses: [],
	...over,
});

describe("answerDevlog", () => {
	it("writes the answer under the post and stamps the time", async () => {
		vi.mocked(prisma.projectReport.findUnique).mockResolvedValue({
			content: "Tide states are in.",
			video: null,
			publishedAt: new Date("2026-09-08T10:00:00.000Z"),
			curatorFeedbackAt: null,
			checkpoint: { goal: "g", items: [outcome("o1")] },
		} as never);
		vi.mocked(checkpointCurator.answerDevlog).mockResolvedValue({
			answer: "This moves the tide work.",
			moves: ["o1"],
			untouched: [],
		});

		await answerDevlog("r1");

		expect(prisma.projectReport.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					curatorFeedback: "This moves the tide work.",
				}),
			}),
		);
	});

	it("does not answer a post that already carries one", async () => {
		vi.mocked(prisma.projectReport.findUnique).mockResolvedValue({
			content: "x",
			video: null,
			publishedAt: new Date(),
			curatorFeedbackAt: new Date(),
			checkpoint: { goal: "g", items: [] },
		} as never);

		await expect(answerDevlog("r1")).resolves.toBeNull();
		expect(checkpointCurator.answerDevlog).not.toHaveBeenCalled();
	});

	it("ignores a devlog that belongs to no checkpoint", async () => {
		vi.mocked(prisma.projectReport.findUnique).mockResolvedValue({
			content: "x",
			video: null,
			publishedAt: new Date(),
			curatorFeedbackAt: null,
			checkpoint: null,
		} as never);

		await expect(answerDevlog("r1")).resolves.toBeNull();
		expect(checkpointCurator.answerDevlog).not.toHaveBeenCalled();
	});

	it("writes nothing when the model fails", async () => {
		vi.mocked(prisma.projectReport.findUnique).mockResolvedValue({
			content: "x",
			video: null,
			publishedAt: new Date(),
			curatorFeedbackAt: null,
			checkpoint: { goal: "g", items: [] },
		} as never);
		vi.mocked(checkpointCurator.answerDevlog).mockResolvedValue(null);

		await expect(answerDevlog("r1")).resolves.toBeNull();
		expect(prisma.projectReport.update).not.toHaveBeenCalled();
	});
});

describe("writeMidNote", () => {
	it("hands the model the unclaimed outcomes rather than asking for them", async () => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
			running({ items: [outcome("o1", readable), outcome("o2")] }) as never,
		);
		vi.mocked(checkpointCurator.writeMidNote).mockResolvedValue({
			note: "One outcome has nothing against it.",
		});

		await writeMidNote("cp1");

		expect(checkpointCurator.writeMidNote).toHaveBeenCalledWith(
			expect.objectContaining({
				unproven: [
					{ id: "o2", text: "outcome o2", reason: "missing" },
				],
			}),
			{},
		);
		expect(prisma.projectCheckpoint.update).toHaveBeenCalled();
	});

	it("does not write a second note", async () => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
			running({ midNote: "already written" }) as never,
		);

		await expect(writeMidNote("cp1")).resolves.toBeNull();
		expect(checkpointCurator.writeMidNote).not.toHaveBeenCalled();
	});

	it("leaves a checkpoint that is not running alone", async () => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
			running({ status: CheckpointStatus.Draft }) as never,
		);

		await expect(writeMidNote("cp1")).resolves.toBeNull();
		expect(checkpointCurator.writeMidNote).not.toHaveBeenCalled();
	});
});

describe("closeCheckpoint", () => {
	it("writes the report and the settled verdict, and closes", async () => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
			running() as never,
		);
		vi.mocked(checkpointCurator.writeReport).mockResolvedValue({
			summary: "The slice is playable.",
			verdict: CheckpointVerdict.StageClosed,
			verdictNote: "Everything owed is proven.",
		});

		await expect(closeCheckpoint("cp1")).resolves.toMatchObject({
			verdict: CheckpointVerdict.StageClosed,
			overrode: null,
		});
		expect(prisma.projectCheckpoint.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					status: CheckpointStatus.Closed,
					verdict: CheckpointVerdict.StageClosed,
				}),
			}),
		);
	});

	it("overrules a verdict the evidence does not support", async () => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
			running({ items: [outcome("o1", readable), outcome("o2")] }) as never,
		);
		vi.mocked(checkpointCurator.writeReport).mockResolvedValue({
			summary: "Good progress.",
			verdict: CheckpointVerdict.StageClosed,
			verdictNote: "Looks done.",
		});

		await expect(closeCheckpoint("cp1")).resolves.toMatchObject({
			verdict: CheckpointVerdict.GoalMissed,
			overrode: CheckpointVerdict.StageClosed,
		});
		expect(prisma.projectCheckpoint.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					verdict: CheckpointVerdict.GoalMissed,
				}),
			}),
		);
	});

	it("does not close on a model failure", async () => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
			running() as never,
		);
		vi.mocked(checkpointCurator.writeReport).mockResolvedValue(null);

		await expect(closeCheckpoint("cp1")).resolves.toBeNull();
		expect(prisma.projectCheckpoint.update).not.toHaveBeenCalled();
	});

	it("does not decide a checkpoint twice", async () => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
			running({
				status: CheckpointStatus.Closed,
				verdict: CheckpointVerdict.GoalMet,
			}) as never,
		);

		await expect(closeCheckpoint("cp1")).resolves.toBeNull();
		expect(checkpointCurator.writeReport).not.toHaveBeenCalled();
	});

	it("sends only the artifacts that are attached, and says which could not be opened", async () => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
			running({
				items: [
					outcome("o1", readable),
					outcome("o2", { ...readable, checkStatus: "Unreachable" }),
					outcome("o3"),
				],
			}) as never,
		);
		vi.mocked(checkpointCurator.writeReport).mockResolvedValue({
			summary: "s",
			verdict: CheckpointVerdict.GoalMissed,
			verdictNote: "n",
		});

		await closeCheckpoint("cp1");

		expect(checkpointCurator.writeReport).toHaveBeenCalledWith(
			expect.objectContaining({
				artifacts: [
					expect.objectContaining({ itemId: "o1", readable: true }),
					expect.objectContaining({ itemId: "o2", readable: false }),
				],
				unproven: [
					expect.objectContaining({ id: "o2", reason: "unreachable" }),
					expect.objectContaining({ id: "o3", reason: "missing" }),
				],
			}),
			{},
		);
	});
});
