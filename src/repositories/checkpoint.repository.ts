import {
	CheckpointCuratorKind,
	CheckpointItemKind,
	CheckpointStatus,
} from "@gdhub-io/gdhub-prisma";
import { CHECKPOINT_DAYS } from "@/schemas/checkpoint";
import { prisma } from "@/services/prisma";

/**
 * Reading and creating checkpoints for a project.
 *
 * The rules that cannot be expressed in the schema live here: one checkpoint at
 * a time per project, the stage it belongs to, and the number it carries within
 * that stage.
 */

/** A checkpoint that has not reached its verdict yet. */
const OPEN_STATUSES = [CheckpointStatus.Active, CheckpointStatus.Review];

const checkpointItemSelect = {
	id: true,
	kind: true,
	order: true,
	text: true,
	originalText: true,
	cut: true,
	addedAt: true,
	note: true,
	acceptedNote: true,
	artifact: {
		select: {
			id: true,
			name: true,
			type: true,
			link: true,
			checkStatus: true,
		},
	},
} as const;

const checkpointSelect = {
	id: true,
	projectId: true,
	stepId: true,
	stageName: true,
	order: true,
	status: true,
	goal: true,
	curatorKind: true,
	startedAt: true,
	dueAt: true,
	goalAgreedAt: true,
	revisedAt: true,
	revisedNote: true,
	midNote: true,
	summary: true,
	verdict: true,
	verdictNote: true,
	decidedAt: true,
	acceptedTermsAt: true,
	createdAt: true,
	updatedAt: true,
	curator: { select: { id: true, name: true, image: true } },
	items: { select: checkpointItemSelect, orderBy: { order: "asc" } },
} as const;

export type Checkpoint = Awaited<ReturnType<typeof getCheckpoint>>;

export const getCheckpoint = async (id: string) =>
	prisma.projectCheckpoint.findUnique({
		where: { id },
		select: checkpointSelect,
	});

/** The one checkpoint a project may have on the go, `Draft` included. */
export const getUnfinishedCheckpoint = async (projectId: string) =>
	prisma.projectCheckpoint.findFirst({
		where: {
			projectId,
			status: { in: [CheckpointStatus.Draft, ...OPEN_STATUSES] },
		},
		orderBy: { createdAt: "desc" },
		select: checkpointSelect,
	});

/**
 * Why a project cannot start another checkpoint, or null when it can.
 *
 * A draft does not block — it *is* the attempt in progress, and the list offers
 * it back as `Continue` rather than pretending nothing is there.
 */
export const getCreationBlocker = async (projectId: string) => {
	const open = await prisma.projectCheckpoint.findFirst({
		where: { projectId, status: { in: OPEN_STATUSES } },
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			status: true,
			dueAt: true,
			stageName: true,
			order: true,
		},
	});

	if (open) return { reason: "checkpointOpen" as const, checkpoint: open };

	const workflow = await prisma.projectWorkflow.findUnique({
		where: { projectId },
		select: { currentStepId: true },
	});

	// A checkpoint belongs to exactly one stage, so a project that is not on one
	// has nowhere to put it.
	if (!workflow?.currentStepId) return { reason: "noStage" as const };

	return null;
};

export const listClosedCheckpoints = async (
	projectId: string,
	{ page = 1, limit = 10 }: { page?: number; limit?: number } = {},
) => {
	const where = {
		projectId,
		status: { in: [CheckpointStatus.Closed, CheckpointStatus.Cancelled] },
	};

	const [rows, total] = await Promise.all([
		prisma.projectCheckpoint.findMany({
			where,
			orderBy: { createdAt: "desc" },
			skip: (page - 1) * limit,
			take: limit,
			select: checkpointSelect,
		}),
		prisma.projectCheckpoint.count({ where }),
	]);

	return { rows, total, page, limit };
};

/**
 * Opens a `Draft` on the stage the project is on now.
 *
 * The stage is snapshotted by name as well as by id: an admin can delete the
 * step later, and a closed checkpoint still has to say which stage it ran in.
 */
export const createDraftCheckpoint = async (projectId: string) => {
	const workflow = await prisma.projectWorkflow.findUnique({
		where: { projectId },
		select: { currentStep: { select: { id: true, name: true } } },
	});

	const step = workflow?.currentStep;
	if (!step) throw new Error("Project is not on a workflow stage");

	const onStage = await prisma.projectCheckpoint.count({
		where: { stepId: step.id },
	});

	return prisma.projectCheckpoint.create({
		data: {
			projectId,
			stepId: step.id,
			stageName: step.name,
			order: onStage + 1,
			curatorKind: CheckpointCuratorKind.AI,
			status: CheckpointStatus.Draft,
			goal: "",
			items: { create: await carryForwardInputs(projectId) },
		},
		select: checkpointSelect,
	});
};

/**
 * The inputs the first step arrives filled in with: the outcomes of the last
 * closed checkpoint, proven ones keeping the artifact that proved them.
 *
 * A missed or cut outcome comes across as a bare line, because it is exactly
 * what the project still does not have. The step people abandon is the empty one.
 */
const carryForwardInputs = async (projectId: string) => {
	const previous = await prisma.projectCheckpoint.findFirst({
		where: { projectId, status: CheckpointStatus.Closed },
		orderBy: { decidedAt: "desc" },
		select: {
			items: {
				where: { kind: CheckpointItemKind.Outcome },
				orderBy: { order: "asc" },
				select: { text: true, artifactId: true },
			},
		},
	});

	return (previous?.items ?? []).map((item, index) => ({
		kind: CheckpointItemKind.Input,
		order: index + 1,
		text: item.text,
		artifactId: item.artifactId,
	}));
};

/** Replaces one side of the goal card. Only a `Draft` may be rewritten this way. */
export const replaceCheckpointItems = async (
	checkpointId: string,
	kind: CheckpointItemKind,
	items: { text: string; artifactId?: string | null }[],
) =>
	prisma.$transaction([
		prisma.checkpointItem.deleteMany({ where: { checkpointId, kind } }),
		prisma.checkpointItem.createMany({
			data: items.map((item, index) => ({
				checkpointId,
				kind,
				order: index + 1,
				text: item.text,
				artifactId: item.artifactId ?? null,
			})),
		}),
	]);

/** Day 1 is `startedAt`; the 28th day is the checkpoint itself. */
export const dueDateFrom = (startedAt: Date) => {
	const due = new Date(startedAt);
	due.setUTCDate(due.getUTCDate() + CHECKPOINT_DAYS - 1);

	return due;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const utcMidnight = (date: Date) =>
	Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

/**
 * Which of the 28 days a checkpoint is on, counted in UTC and on the server.
 *
 * Counted from midnight to midnight rather than from the hour it started, so a
 * checkpoint bought at 23:50 is not on day 2 ten minutes later. Computed here
 * and sent with the payload because a browser in another timezone would show a
 * different day number for the same checkpoint, and the deadline is the product.
 */
export const checkpointDay = (startedAt: Date, now = new Date()) => {
	const elapsed = (utcMidnight(now) - utcMidnight(startedAt)) / MS_PER_DAY;

	return Math.min(Math.max(elapsed + 1, 1), CHECKPOINT_DAYS);
};

/** The day number and days left, or nulls for a checkpoint that has not started. */
export const checkpointProgress = (
	startedAt: Date | null,
	now = new Date(),
) => {
	if (!startedAt) return { day: null, daysLeft: null };

	const day = checkpointDay(startedAt, now);

	return { day, daysLeft: CHECKPOINT_DAYS - day };
};

/** Stamps the day count onto a checkpoint before it leaves the server. */
export const withProgress = <T extends { startedAt: Date | null }>(
	checkpoint: T | null,
) =>
	checkpoint
		? { ...checkpoint, ...checkpointProgress(checkpoint.startedAt) }
		: null;
