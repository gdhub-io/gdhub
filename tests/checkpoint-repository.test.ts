import { CheckpointStatus } from "@gdhub-io/gdhub-prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { dueDateFrom } from "@/lib/checkpoint-days";
import {
	createDraftCheckpoint,
	getCreationBlocker,
} from "@/repositories/checkpoint.repository";
import { ensureCheckpointStage } from "@/repositories/project-workflow";
import { prisma } from "@/services/prisma";

vi.mock("@/repositories/project-workflow", () => ({
	ensureCheckpointStage: vi.fn(),
}));

vi.mock("@/services/prisma", () => ({
	prisma: {
		projectCheckpoint: {
			findFirst: vi.fn(),
			count: vi.fn(),
			create: vi.fn(),
		},
		projectWorkflow: { findUnique: vi.fn() },
	},
}));

beforeEach(() => {
	vi.clearAllMocks();
	vi.stubEnv("CHECKPOINTS_PURCHASE_OPEN", "true");
});

describe("getCreationBlocker", () => {
	it("refuses a new checkpoint while purchase is closed", async () => {
		vi.stubEnv("CHECKPOINTS_PURCHASE_OPEN", "");
		vi.mocked(prisma.projectCheckpoint.findFirst).mockResolvedValue(null);
		vi.mocked(prisma.projectWorkflow.findUnique).mockResolvedValue({
			_count: { steps: 9 },
		} as never);

		await expect(getCreationBlocker("p1")).resolves.toEqual({
			reason: "purchaseClosed",
		});
	});

	it("refuses while a checkpoint is still on the go", async () => {
		vi.mocked(prisma.projectCheckpoint.findFirst).mockResolvedValue({
			id: "cp1",
			status: CheckpointStatus.Active,
			dueAt: new Date("2026-09-28"),
			stageName: "Prototyping",
			order: 1,
		} as never);

		await expect(getCreationBlocker("p1")).resolves.toMatchObject({
			reason: "checkpointOpen",
		});
		expect(prisma.projectWorkflow.findUnique).not.toHaveBeenCalled();
	});

	// A draft is the attempt itself and does not block. A checkpoint waiting on
	// its curator does: it is paid for, and a second one beside it would be two
	// live purchases on one project.
	it("counts a paid checkpoint as open, and a draft as not", async () => {
		vi.mocked(prisma.projectCheckpoint.findFirst).mockResolvedValue(null);
		vi.mocked(prisma.projectWorkflow.findUnique).mockResolvedValue({
			_count: { steps: 9 },
		} as never);

		await expect(getCreationBlocker("p1")).resolves.toBeNull();
		expect(prisma.projectCheckpoint.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					projectId: "p1",
					status: {
						in: [
							CheckpointStatus.AwaitingCurator,
							CheckpointStatus.Active,
							CheckpointStatus.Review,
						],
					},
				},
			}),
		);
	});

	it("refuses a workflow with no stages — a checkpoint has nowhere to sit", async () => {
		vi.mocked(prisma.projectCheckpoint.findFirst).mockResolvedValue(null);
		vi.mocked(prisma.projectWorkflow.findUnique).mockResolvedValue({
			_count: { steps: 0 },
		} as never);

		await expect(getCreationBlocker("p1")).resolves.toMatchObject({
			reason: "noStage",
		});
	});

	// Drafting gives such a project the default workflow on Ideation.
	it("does not block a project that has no workflow yet", async () => {
		vi.mocked(prisma.projectCheckpoint.findFirst).mockResolvedValue(null);
		vi.mocked(prisma.projectWorkflow.findUnique).mockResolvedValue(null);

		await expect(getCreationBlocker("p1")).resolves.toBeNull();
	});
});

describe("createDraftCheckpoint", () => {
	const currentStep = { id: "step-3", name: "Prototyping" };

	it("snapshots the stage name and numbers it through the whole project", async () => {
		vi.mocked(ensureCheckpointStage).mockResolvedValue(currentStep);
		vi.mocked(prisma.projectCheckpoint.count).mockResolvedValue(2 as never);
		vi.mocked(prisma.projectCheckpoint.findFirst).mockResolvedValue(null);
		vi.mocked(prisma.projectCheckpoint.create).mockResolvedValue({} as never);

		await createDraftCheckpoint("p1");

		expect(prisma.projectCheckpoint.count).toHaveBeenCalledWith({
			where: { projectId: "p1" },
		});
		expect(prisma.projectCheckpoint.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					stepId: "step-3",
					stageName: "Prototyping",
					order: 3,
					status: CheckpointStatus.Draft,
				}),
			}),
		);
	});

	it("carries the last checkpoint's outcomes forward as inputs, artifacts attached", async () => {
		vi.mocked(ensureCheckpointStage).mockResolvedValue(currentStep);
		vi.mocked(prisma.projectCheckpoint.count).mockResolvedValue(0 as never);
		vi.mocked(prisma.projectCheckpoint.findFirst).mockResolvedValue({
			items: [
				{
					text: "A playable slice",
					evidence: [{ artifactId: "art-1" }, { artifactId: "art-2" }],
				},
				{ text: "Two tide states", evidence: [] },
			],
		} as never);
		vi.mocked(prisma.projectCheckpoint.create).mockResolvedValue({} as never);

		await createDraftCheckpoint("p1");

		const { data } = vi.mocked(prisma.projectCheckpoint.create).mock
			.calls[0][0] as never as {
			data: {
				items: {
					create: {
						text: string;
						evidence: { create: { artifactId: string }[] };
					}[];
				};
			};
		};

		expect(data.items.create).toEqual([
			expect.objectContaining({
				order: 1,
				text: "A playable slice",
				// Every artifact the outcome held, not only the first.
				evidence: { create: [{ artifactId: "art-1" }, { artifactId: "art-2" }] },
			}),
			expect.objectContaining({
				order: 2,
				text: "Two tide states",
				evidence: { create: [] },
			}),
		]);
	});

	it("refuses when the project sits on no stage", async () => {
		vi.mocked(ensureCheckpointStage).mockResolvedValue(null);

		await expect(createDraftCheckpoint("p1")).rejects.toThrow(
			"Project is not on a workflow stage",
		);
	});
});

describe("dueDateFrom", () => {
	it("counts day 1 as the start, so 28 days end 27 days later", () => {
		expect(dueDateFrom(new Date("2026-09-01T10:00:00Z")).toISOString()).toBe(
			"2026-09-28T10:00:00.000Z",
		);
	});

	it("crosses a month boundary", () => {
		expect(dueDateFrom(new Date("2026-08-20T00:00:00Z")).toISOString()).toBe(
			"2026-09-16T00:00:00.000Z",
		);
	});

	it("crosses a leap-year February", () => {
		expect(dueDateFrom(new Date("2028-02-10T00:00:00Z")).toISOString()).toBe(
			"2028-03-08T00:00:00.000Z",
		);
	});
});
