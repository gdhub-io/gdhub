import { CheckpointStatus } from "@gdhub-io/gdhub-prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { dueDateFrom } from "@/lib/checkpoint-days";
import {
	createDraftCheckpoint,
	getCreationBlocker,
} from "@/repositories/checkpoint.repository";
import { prisma } from "@/services/prisma";

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
});

describe("getCreationBlocker", () => {
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

	it("counts only Active and Review as open — a draft is the attempt itself", async () => {
		vi.mocked(prisma.projectCheckpoint.findFirst).mockResolvedValue(null);
		vi.mocked(prisma.projectWorkflow.findUnique).mockResolvedValue({
			currentStepId: "step-3",
		} as never);

		await expect(getCreationBlocker("p1")).resolves.toBeNull();
		expect(prisma.projectCheckpoint.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					projectId: "p1",
					status: { in: [CheckpointStatus.Active, CheckpointStatus.Review] },
				},
			}),
		);
	});

	it("refuses a project that is not on a stage — a checkpoint has nowhere to sit", async () => {
		vi.mocked(prisma.projectCheckpoint.findFirst).mockResolvedValue(null);
		vi.mocked(prisma.projectWorkflow.findUnique).mockResolvedValue({
			currentStepId: null,
		} as never);

		await expect(getCreationBlocker("p1")).resolves.toMatchObject({
			reason: "noStage",
		});
	});
});

describe("createDraftCheckpoint", () => {
	const currentStep = { id: "step-3", name: "Prototyping" };

	it("snapshots the stage name and numbers the checkpoint within that stage", async () => {
		vi.mocked(prisma.projectWorkflow.findUnique).mockResolvedValue({
			currentStep,
		} as never);
		vi.mocked(prisma.projectCheckpoint.count).mockResolvedValue(2 as never);
		vi.mocked(prisma.projectCheckpoint.findFirst).mockResolvedValue(null);
		vi.mocked(prisma.projectCheckpoint.create).mockResolvedValue({} as never);

		await createDraftCheckpoint("p1");

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
		vi.mocked(prisma.projectWorkflow.findUnique).mockResolvedValue({
			currentStep,
		} as never);
		vi.mocked(prisma.projectCheckpoint.count).mockResolvedValue(0 as never);
		vi.mocked(prisma.projectCheckpoint.findFirst).mockResolvedValue({
			items: [
				{ text: "A playable slice", artifactId: "art-1" },
				{ text: "Two tide states", artifactId: null },
			],
		} as never);
		vi.mocked(prisma.projectCheckpoint.create).mockResolvedValue({} as never);

		await createDraftCheckpoint("p1");

		const { data } = vi.mocked(prisma.projectCheckpoint.create).mock
			.calls[0][0] as never as {
			data: { items: { create: { text: string; artifactId: string | null }[] } };
		};

		expect(data.items.create).toEqual([
			expect.objectContaining({
				order: 1,
				text: "A playable slice",
				artifactId: "art-1",
			}),
			expect.objectContaining({
				order: 2,
				text: "Two tide states",
				artifactId: null,
			}),
		]);
	});

	it("refuses when the project sits on no stage", async () => {
		vi.mocked(prisma.projectWorkflow.findUnique).mockResolvedValue({
			currentStep: null,
		} as never);

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
