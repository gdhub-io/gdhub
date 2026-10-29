import {
	CheckpointCuratorKind,
	CheckpointItemKind,
	CheckpointStatus,
	PayableType,
	PaymentStatus,
	type Prisma,
} from "@gdhub-io/gdhub-prisma";
import { checkpointPurchaseOpen } from "@/config/checkpoint-pricing";
import {
	checkpointProgress,
	dayNumberOn,
	dueDateFrom,
} from "@/lib/checkpoints/days";
import { authorNextStep } from "@/lib/checkpoints/plan";
import { buildSessions } from "@/lib/checkpoints/sessions";
import { checkpointSignals } from "@/lib/checkpoints/signals";
import { buildSprints, sprintOfDate } from "@/lib/checkpoints/sprints";
import {
	CHECKPOINT_CURRENT_STATUSES,
	CHECKPOINT_OPEN_STATUSES,
	CHECKPOINT_PENDING_STATUSES,
	checkpointMove,
	isOpen,
} from "@/lib/checkpoints/status";
import { bookSessions } from "@/repositories/advisor/availability";
import { checkpointLineage } from "@/repositories/checkpoints/number";
import {
	checkpointSelect,
	curatorWithCraftSelect,
	sessionRowSelect,
	withAcceptedTerms,
	withCraft,
} from "@/repositories/checkpoints/select";
import {
	ensureCheckpointStage,
	type Tx,
} from "@/repositories/project/workflow";
import { CONFIRMED_STATUS } from "@/repositories/scout/games";
import { prisma } from "@/services/prisma";

/**
 * Reading and creating checkpoints for a project.
 *
 * The rules that cannot be expressed in the schema live here: one checkpoint at
 * a time per project, the stage it belongs to, and the number it carries through
 * the project.
 */

/**
 * The one on the go carries its three signals; the closed rows below it do not,
 * so the reports, pulses and team are read only for this one checkpoint.
 */
const currentCheckpointSelect = {
	...checkpointSelect,
	curator: curatorWithCraftSelect,
	reports: { select: { publishedAt: true } },
	pulses: { select: { week: true, confirmedAt: true } },
	project: {
		select: {
			team: {
				select: {
					members: {
						where: CONFIRMED_STATUS,
						select: { startedAt: true, finishedAt: true },
					},
				},
			},
		},
	},
} as const;

/**
 * A draft whose last checkout failed or expired. A `PENDING` one is not counted:
 * it may be open in another tab, or paid with the webhook still on its way.
 */
const paymentFailed = async (row: {
	id: string;
	status: CheckpointStatus;
	paymentId: string | null;
}) => {
	if (row.status !== CheckpointStatus.Draft || row.paymentId) return false;

	const last = await prisma.payment.findFirst({
		where: { payableType: PayableType.CHECKPOINT, payableId: row.id },
		orderBy: { createdAt: "desc" },
		select: { status: true },
	});

	return (
		last?.status === PaymentStatus.FAILED ||
		last?.status === PaymentStatus.CANCELED
	);
};

/** The one checkpoint a project may have on the go, `Draft` included. */
export const getUnfinishedCheckpoint = async (projectId: string) => {
	const row = await prisma.projectCheckpoint.findFirst({
		where: {
			projectId,
			status: { in: CHECKPOINT_CURRENT_STATUSES },
		},
		orderBy: { createdAt: "desc" },
		select: currentCheckpointSelect,
	});

	if (!row) return null;

	const { reports, pulses, project, curator, ...checkpoint } =
		withAcceptedTerms(row);
	const { startedAt } = checkpoint;
	const [failed, lineage] = await Promise.all([
		paymentFailed(checkpoint),
		checkpointLineage(checkpoint),
	]);

	return {
		...checkpoint,
		paymentFailed: failed,
		// A draft's is the number it takes once paid; analytics reads it with the kind before it.
		number: lineage.number,
		previousCuratorKind: lineage.previousCuratorKind,
		curator: withCraft(curator),
		sprints: buildSprints(startedAt),
		// Only a running checkpoint asks anything of its author on a given day.
		next:
			startedAt &&
			(checkpoint.status === CheckpointStatus.Active ||
				checkpoint.status === CheckpointStatus.Review)
				? authorNextStep(
						dayNumberOn(startedAt, new Date()),
						new Set(
							reports
								.map((report) => sprintOfDate(startedAt, report.publishedAt))
								.filter((sprint) => sprint !== null),
						),
					)
				: null,
		signals: checkpointSignals({
			startedAt: checkpoint.startedAt,
			reports,
			pulses,
			members: project.team?.members ?? [],
			outcomes: checkpoint.items
				.filter((item) => item.kind === CheckpointItemKind.Outcome)
				.map((item) => ({
					cut: item.cut,
					hasArtifact: item.evidence.length > 0,
				})),
		}),
	};
};

/**
 * Why a project cannot start another checkpoint, or null when it can.
 *
 * A draft does not block — it *is* the attempt in progress, and the list offers
 * it back as `Continue` rather than pretending nothing is there.
 */
export const getCreationBlocker = async (
	projectId: string,
	current?: Pick<
		Awaited<ReturnType<typeof getUnfinishedCheckpoint>> & object,
		"id" | "status" | "dueAt" | "stageName" | "order"
	> | null,
) => {
	// The newest current row, when open, is the newest open one: no second read.
	const open =
		current && isOpen(current.status)
			? {
					id: current.id,
					status: current.status,
					dueAt: current.dueAt,
					stageName: current.stageName,
					order: current.order,
				}
			: await prisma.projectCheckpoint.findFirst({
					where: { projectId, status: { in: CHECKPOINT_OPEN_STATUSES } },
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
		select: { _count: { select: { steps: true } } },
	});

	// A checkpoint belongs to exactly one stage. Drafting one puts a project
	// without a workflow, or still on the first stage, on Ideation — only a
	// workflow with no stages at all leaves it nowhere to sit.
	if (workflow && workflow._count.steps === 0) {
		return { reason: "noStage" as const };
	}

	if (!checkpointPurchaseOpen()) return { reason: "purchaseClosed" as const };

	return null;
};

/**
 * Every checkpoint of the project except the one on the go.
 *
 * Filtering by `Closed` and `Cancelled` alone hid anything that was neither:
 * a project that ended up with two unfinished checkpoints — which it could,
 * before a paid one counted as open — showed the newest and lost the other,
 * payment and all. Excluding the current row instead means nothing can fall
 * between the two lists.
 */
export const listClosedCheckpoints = async (
	projectId: string,
	{
		page = 1,
		limit = 10,
		exceptId,
	}: { page?: number; limit?: number; exceptId?: string } = {},
) => {
	const where = {
		projectId,
		...(exceptId ? { id: { not: exceptId } } : {}),
	};

	const [rows, total] = await Promise.all([
		prisma.projectCheckpoint.findMany({
			where,
			orderBy: { createdAt: "desc" },
			skip: (page - 1) * limit,
			take: limit,
			// A closed card lists its held sessions, each a link to its notes.
			select: { ...checkpointSelect, sessions: sessionRowSelect },
		}),
		prisma.projectCheckpoint.count({ where }),
	]);

	return {
		rows: rows.map(({ sessions, ...row }) => ({
			...withAcceptedTerms(row),
			sessions: buildSessions(row.startedAt, sessions, row.curatorKind, {
				curatorId: row.curator?.id ?? null,
			}),
		})),
		total,
		page,
		limit,
	};
};

/**
 * Opens a `Draft` on the stage the project is on now — Ideation for a project
 * still on Introduction (see `ensureCheckpointStage`).
 *
 * The stage is snapshotted by name as well as by id: an admin can delete the
 * step later, and a closed checkpoint still has to say which stage it ran in.
 */
export const createDraftCheckpoint = async (projectId: string) => {
	const step = await ensureCheckpointStage(projectId);
	if (!step) throw new Error("Project is not on a workflow stage");

	// The number runs through the project, not through the stage: a reader tells
	// checkpoints apart by it, and restarting at 1 on every stage would put two
	// "Checkpoint 1" rows in the same list.
	const before = await prisma.projectCheckpoint.count({ where: { projectId } });

	const draft = await prisma.projectCheckpoint.create({
		data: {
			projectId,
			stepId: step.id,
			stageName: step.name,
			order: before + 1,
			curatorKind: CheckpointCuratorKind.AI,
			status: CheckpointStatus.Draft,
			goal: "",
			items: { create: await carryForwardInputs(projectId) },
		},
		select: checkpointSelect,
	});
	return withAcceptedTerms(draft);
};

/**
 * The inputs the first step arrives filled in with: the outcomes of the last
 * closed checkpoint, proven ones keeping the artifact that proved them.
 *
 * A missed or cut outcome comes across as a bare line, because it is exactly
 * what the project still does not have. The step people abandon is the empty one.
 */
const carryForwardInputs = async (projectId: string) =>
	(await lastClosedOutcomes(projectId)).map((item, index) => ({
		kind: CheckpointItemKind.Input,
		order: index + 1,
		text: item.text,
		evidence: {
			create: item.evidence.map(({ artifactId }) => ({ artifactId })),
		},
	}));

/** What the project's last closed checkpoint owed — which is what it has now. */
export const lastClosedOutcomes = async (projectId: string) => {
	const previous = await prisma.projectCheckpoint.findFirst({
		where: { projectId, status: CheckpointStatus.Closed },
		orderBy: { decidedAt: "desc" },
		select: {
			items: {
				where: { kind: CheckpointItemKind.Outcome },
				orderBy: { order: "asc" },
				select: { text: true, evidence: { select: { artifactId: true } } },
			},
		},
	});

	return previous?.items ?? [];
};

/** Writes one side of the goal card in order, with the artifact each line names. */
export const createCheckpointItems = async (
	db: Tx,
	checkpointId: string,
	kind: CheckpointItemKind,
	items: { text: string; artifactId?: string | null }[],
) => {
	const created = await db.checkpointItem.createManyAndReturn({
		data: items.map((item, index) => ({
			checkpointId,
			kind,
			order: index + 1,
			text: item.text,
		})),
		select: { id: true, order: true },
	});
	const evidence = created.flatMap(({ id, order }) => {
		const artifactId = items[order - 1].artifactId;
		return artifactId ? [{ itemId: id, artifactId }] : [];
	});
	if (evidence.length) {
		await db.checkpointItemEvidence.createMany({ data: evidence });
	}
};

/** Replaces one side of the goal card. Only a `Draft` may be rewritten this way. */
export const replaceCheckpointItems = (
	checkpointId: string,
	kind: CheckpointItemKind,
	items: { text: string; artifactId?: string | null }[],
) =>
	prisma.$transaction(async (tx) => {
		await tx.checkpointItem.deleteMany({ where: { checkpointId, kind } });
		await createCheckpointItems(tx, checkpointId, kind, items);
	});

/**
 * The day counter, and only where it is true.
 *
 * `startedAt` exists from the moment the author picks a date, so counting from
 * it alone would put a paid checkpoint on "day 1 of 28" while it is still
 * waiting for the person who has to run those days.
 */
export const withProgress = <
	T extends { startedAt: Date | null; status: CheckpointStatus },
>(
	checkpoint: T | null,
) => {
	if (!checkpoint) return null;

	const running =
		checkpoint.status === CheckpointStatus.Active ||
		checkpoint.status === CheckpointStatus.Review ||
		checkpoint.status === CheckpointStatus.Closed;

	return {
		...checkpoint,
		...(running
			? checkpointProgress(checkpoint.startedAt)
			: { day: null, daysLeft: null }),
	};
};

export const checkpointStatusOf = (id: string) =>
	prisma.projectCheckpoint.findUnique({
		where: { id },
		select: { status: true },
	});

/** What a start-flow step is checked against before it is saved. */
export const checkpointDraftState = (id: string) =>
	prisma.projectCheckpoint.findUnique({
		where: { id },
		select: {
			status: true,
			curatorKind: true,
			curatorId: true,
			stageName: true,
		},
	});

/** Writes a start-flow step; 0 when the checkpoint left the state `where` expects. */
export const updateCheckpointDraft = async (
	where: Prisma.ProjectCheckpointWhereInput,
	data: Prisma.ProjectCheckpointUpdateManyMutationInput,
) => (await prisma.projectCheckpoint.updateMany({ where, data })).count;

/** As `updateCheckpointDraft`, booking the curator's calls in the same transaction; throws `SlotTakenError`. */
export const updateCheckpointDraftAndBook = (
	id: string,
	where: Prisma.ProjectCheckpointWhereInput,
	data: Prisma.ProjectCheckpointUpdateManyMutationInput,
) =>
	prisma.$transaction(async (tx) => {
		const { count } = await tx.projectCheckpoint.updateMany({
			where,
			data,
		});
		if (count) await bookSessions(tx, id);
		return count;
	});

export const deleteCheckpoint = (id: string) =>
	prisma.projectCheckpoint.delete({ where: { id } });

/** Deletes a checkpoint only while it has not started; 0 when a curator's yes started it meanwhile. */
export const deletePendingCheckpoint = async (id: string) =>
	(
		await prisma.projectCheckpoint.deleteMany({
			where: { id, status: { in: CHECKPOINT_PENDING_STATUSES } },
		})
	).count;

/** What the curator's answer is checked against. */
export const curatorAnswerState = (id: string) =>
	prisma.projectCheckpoint.findUnique({
		where: { id },
		select: { status: true, curatorId: true, startedAt: true },
	});

/** The curator's yes: records the acceptances and starts the days; 0 when it stopped waiting meanwhile. */
export const startAcceptedCheckpoint = async (
	id: string,
	startedAt: Date,
	acceptances: Prisma.LegalAcceptanceCreateManyInput[],
) => {
	if (acceptances.length)
		await prisma.legalAcceptance.createMany({ data: acceptances });
	const move = checkpointMove(
		CheckpointStatus.AwaitingCurator,
		CheckpointStatus.Active,
	);
	const { count } = await prisma.projectCheckpoint.updateMany({
		where: { id, ...move.where },
		data: {
			...move.data,
			curatorAcceptedAt: new Date(),
			startedAt,
			dueAt: dueDateFrom(startedAt),
		},
	});
	return count;
};

/** The first opening is the one kept. */
export const markPreviousVerdictRead = (id: string) =>
	prisma.projectCheckpoint.updateMany({
		where: { id, previousVerdictReadAt: null },
		data: { previousVerdictReadAt: new Date() },
	});

/** The goal card's items and their evidence, as attaching evidence checks them. */
export const evidenceTargetOf = (id: string) =>
	prisma.projectCheckpoint.findUnique({
		where: { id },
		select: {
			status: true,
			projectId: true,
			items: {
				select: {
					id: true,
					kind: true,
					evidence: { select: { artifactId: true } },
				},
			},
		},
	});

export const evidenceArtifactOf = (artifactId: string) =>
	prisma.projectArtifact.findUnique({
		where: { id: artifactId },
		select: { projectId: true, checkStatus: true },
	});

export const attachEvidence = (itemIds: string[], artifactId: string) =>
	prisma.checkpointItemEvidence.createMany({
		data: itemIds.map((itemId) => ({ itemId, artifactId })),
		skipDuplicates: true,
	});

export const detachEvidence = (itemId: string, artifactId: string) =>
	prisma.checkpointItemEvidence.deleteMany({
		where: { itemId, artifactId },
	});
