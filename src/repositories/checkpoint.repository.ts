import {
	CheckpointCuratorKind,
	CheckpointItemKind,
	CheckpointStatus,
	type Prisma,
} from "@gdhub-io/gdhub-prisma";
import { checkpointProgress, utcStartOfDay } from "@/lib/checkpoint-days";
import {
	currentSprint,
	devlogDayOf,
	SPRINTS_PER_CHECKPOINT,
	sprintDayRange,
	sprintOfDate,
	sprintRange,
} from "@/lib/checkpoint-sprints";
import { CONFIRMED_STATUS } from "@/repositories/scout.games";
import { prisma } from "@/services/prisma";
import type {
	CheckpointArtifactRef,
	CheckpointEvidenceDto,
	CheckpointPulseCellDto,
	CheckpointPulseRowDto,
	CheckpointSprintDto,
} from "@/types/checkpoints";

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

/** The artifact as the evidence list needs it: the ref, plus who offered it. */
const evidenceArtifactSelect = {
	id: true,
	name: true,
	type: true,
	link: true,
	checkStatus: true,
	createdAt: true,
	createdByUser: { select: { id: true, name: true, image: true } },
} as const;

/**
 * The detail payload answers the whole page in one request: the devlog thread,
 * the four sprints, the pulse matrix and the evidence. Each of them is read on
 * the same screen, and splitting them would cost a round trip per section.
 *
 * The team is reached through the project — a checkpoint has no team of its own
 * — and the members are the confirmed ones including those who have left, since
 * a sprint someone was not on the team for is a blank cell, not an absence.
 */
const checkpointDetailSelect = {
	...checkpointSelect,
	// Wider than the list's: an item's artifact is also a row of the evidence.
	items: {
		select: {
			...checkpointItemSelect,
			artifact: { select: evidenceArtifactSelect },
		},
		orderBy: { order: "asc" },
	},
	reports: {
		orderBy: { publishedAt: "desc" },
		select: {
			id: true,
			publishedAt: true,
			content: true,
			curatorFeedback: true,
			curatorFeedbackAt: true,
		},
	},
	pulses: {
		select: {
			teamMemberId: true,
			week: true,
			confirmedAt: true,
			source: true,
		},
	},
	artifacts: { select: evidenceArtifactSelect },
	project: {
		select: {
			team: {
				select: {
					members: {
						where: CONFIRMED_STATUS,
						orderBy: { startedAt: "asc" },
						select: {
							id: true,
							startedAt: true,
							finishedAt: true,
							position: true,
							user: { select: { id: true, name: true, image: true } },
							speciality: { select: { name: true } },
						},
					},
				},
			},
		},
	},
} as const;

type DetailRow = Prisma.ProjectCheckpointGetPayload<{
	select: typeof checkpointDetailSelect;
}>;

type EvidenceArtifact = DetailRow["artifacts"][number];
type PulseRow = DetailRow["pulses"][number];
type TeamMemberRow = NonNullable<
	DetailRow["project"]["team"]
>["members"][number];

const toArtifactRef = ({
	id,
	name,
	type,
	link,
	checkStatus,
}: EvidenceArtifact): CheckpointArtifactRef => ({
	id,
	name,
	type,
	link,
	checkStatus,
});

/** The four sprints, or nothing at all: a draft has no dates to divide. */
const buildSprints = (startedAt: Date | null): CheckpointSprintDto[] => {
	if (!startedAt) return [];

	const now = new Date();
	const today = utcStartOfDay(now);
	const current = currentSprint(startedAt, now);

	return Array.from({ length: SPRINTS_PER_CHECKPOINT }, (_, index) => {
		const number = index + 1;
		const { from, to } = sprintRange(startedAt, number);
		const { firstDay, lastDay } = sprintDayRange(number);
		// `currentSprint` clamps to the fourth, so a finished sprint is decided by
		// its last day rather than by which one it names.
		const state =
			to < today ? "done" : number === current ? "current" : "ahead";

		return {
			number,
			from: from.toISOString(),
			to: to.toISOString(),
			firstDay,
			lastDay,
			devlogDay: devlogDayOf(number),
			state,
		} satisfies CheckpointSprintDto;
	});
};

const pulseCell = (
	sprint: number,
	member: TeamMemberRow,
	pulse: PulseRow | undefined,
	startedAt: Date,
	now: Date,
): CheckpointPulseCellDto => {
	const { from, to } = sprintRange(startedAt, sprint);
	const joined = utcStartOfDay(member.startedAt);
	const left = member.finishedAt ? utcStartOfDay(member.finishedAt) : null;
	const blank = { sprint, confirmedAt: null, source: null };

	if (joined > to || (left && left < from)) {
		return { ...blank, state: "notOnTeam" };
	}

	if (!pulse) return { ...blank, state: "notAsked" };

	if (pulse.confirmedAt) {
		return {
			sprint,
			state: "confirmed",
			confirmedAt: pulse.confirmedAt.toISOString(),
			source: pulse.source,
		};
	}

	// Asked and unanswered: a miss only once the sprint is over, otherwise there
	// is still time to answer.
	return {
		sprint,
		state: to < utcStartOfDay(now) ? "missed" : "waiting",
		confirmedAt: null,
		source: pulse.source,
	};
};

const buildPulseRows = (
	members: TeamMemberRow[],
	pulses: PulseRow[],
	startedAt: Date | null,
): CheckpointPulseRowDto[] => {
	const now = new Date();
	const byMemberAndSprint = new Map(
		pulses.map((pulse) => [`${pulse.teamMemberId}:${pulse.week}`, pulse]),
	);

	return members.map((member) => ({
		memberId: member.id,
		userId: member.user.id,
		name: member.user.name,
		image: member.user.image,
		role: member.speciality?.name ?? member.position,
		joinedAt: member.startedAt.toISOString(),
		leftAt: member.finishedAt?.toISOString() ?? null,
		cells: startedAt
			? Array.from({ length: SPRINTS_PER_CHECKPOINT }, (_, index) =>
					pulseCell(
						index + 1,
						member,
						byMemberAndSprint.get(`${member.id}:${index + 1}`),
						startedAt,
						now,
					),
				)
			: [],
	}));
};

/**
 * Everything offered as evidence: the artifacts made for this checkpoint and
 * the ones its items point at. The two sets overlap, and the second can hold an
 * artifact from an earlier checkpoint — an author may prove an outcome with
 * something the project already had.
 */
const buildEvidence = (
	items: DetailRow["items"],
	artifacts: EvidenceArtifact[],
	startedAt: Date | null,
): CheckpointEvidenceDto[] => {
	const itemIdsByArtifact = new Map<string, string[]>();

	for (const item of items) {
		if (!item.artifact) continue;
		const known = itemIdsByArtifact.get(item.artifact.id);
		if (known) known.push(item.id);
		else itemIdsByArtifact.set(item.artifact.id, [item.id]);
	}

	const byId = new Map<string, EvidenceArtifact>();

	for (const artifact of [
		...artifacts,
		...items.flatMap((item) => (item.artifact ? [item.artifact] : [])),
	]) {
		byId.set(artifact.id, artifact);
	}

	return [...byId.values()]
		.map((artifact) => ({
			artifact: toArtifactRef(artifact),
			addedAt: artifact.createdAt.toISOString(),
			addedBy: artifact.createdByUser,
			itemIds: itemIdsByArtifact.get(artifact.id) ?? [],
			sprint: startedAt ? sprintOfDate(startedAt, artifact.createdAt) : null,
		}))
		.sort(
			(a, b) =>
				a.addedAt.localeCompare(b.addedAt) ||
				a.artifact.id.localeCompare(b.artifact.id),
		);
};

export type Checkpoint = Awaited<ReturnType<typeof getCheckpoint>>;

/** The row as the checkpoint page reads it; the artifact joins stay behind. */
const toCheckpointDetail = (row: DetailRow) => {
	const { artifacts, items, project, pulses, reports, ...checkpoint } = row;
	const { startedAt } = checkpoint;

	return {
		...checkpoint,
		items: items.map((item) => ({
			...item,
			artifact: item.artifact ? toArtifactRef(item.artifact) : null,
		})),
		reports: reports.map((report) => ({
			...report,
			sprint: startedAt ? sprintOfDate(startedAt, report.publishedAt) : null,
		})),
		sprints: buildSprints(startedAt),
		pulses: buildPulseRows(project.team?.members ?? [], pulses, startedAt),
		evidence: buildEvidence(items, artifacts, startedAt),
	};
};

export const getCheckpoint = async (id: string) => {
	const row = await prisma.projectCheckpoint.findUnique({
		where: { id },
		select: checkpointDetailSelect,
	});

	return row ? toCheckpointDetail(row) : null;
};

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

/** Stamps the day count onto a checkpoint before it leaves the server. */
export const withProgress = <T extends { startedAt: Date | null }>(
	checkpoint: T | null,
) =>
	checkpoint
		? { ...checkpoint, ...checkpointProgress(checkpoint.startedAt) }
		: null;
