import {
	CheckpointCuratorKind,
	CheckpointItemKind,
	CheckpointStatus,
	PayableType,
	PaymentStatus,
	type Prisma,
	ProjectArtifactType,
} from "@gdhub-io/gdhub-prisma";
import {
	CHECKPOINT_DAYS,
	CHECKPOINT_OPEN_STATUSES,
	SPRINTS_PER_CHECKPOINT,
} from "@/config/checkpoint";
import { checkpointPurchaseOpen } from "@/config/checkpoint-pricing";
import {
	type ActivityEvent,
	activeDaysByUser,
} from "@/lib/checkpoint-activity";
import {
	checkpointProgress,
	dayNumberOn,
	utcStartOfDay,
} from "@/lib/checkpoint-days";
import { authorNextStep, dateOfDay } from "@/lib/checkpoint-plan";
import { buildSessions } from "@/lib/checkpoint-sessions";
import { checkpointSignals } from "@/lib/checkpoint-signals";
import {
	currentSprint,
	devlogDayOf,
	sprintDayRange,
	sprintOfDate,
	sprintRange,
} from "@/lib/checkpoint-sprints";
import { checkpointNumber } from "@/repositories/checkpoint-number";
import { heldAmount, toWholePrice } from "@/repositories/checkpoint-payment";
import { ensureCheckpointStage } from "@/repositories/project-workflow";
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
 * a time per project, the stage it belongs to, and the number it carries through
 * the project.
 */

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

/** Everything a checkpoint row needs to be drawn, wherever it is drawn. */
export const checkpointSelect = {
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
	previousVerdictReadAt: true,
	revisedAt: true,
	revisedNote: true,
	midNote: true,
	summary: true,
	verdict: true,
	verdictNote: true,
	decidedAt: true,
	acceptedTermsAt: true,
	curatorAcceptedAt: true,
	curatorDeclinedAt: true,
	declinedCuratorIds: true,
	paymentId: true,
	createdAt: true,
	updatedAt: true,
	curator: { select: { id: true, name: true, image: true } },
	items: { select: checkpointItemSelect, orderBy: { order: "asc" } },
} as const;

// The card and the page header name the curator's craft; their strongest speciality stands for it.
const curatorWithCraftSelect = {
	select: {
		id: true,
		name: true,
		image: true,
		specialities: {
			select: { name: true, level: true },
			orderBy: { level: "desc" },
			take: 1,
		},
	},
} as const;

const withCraft = <
	T extends { specialities: { name: string; level: string }[] },
>(
	curator: T | null,
) => {
	if (!curator) return null;
	const { specialities, ...rest } = curator;

	return { ...rest, speciality: specialities[0] ?? null };
};

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
	curator: curatorWithCraftSelect,
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
			authorId: true,
			publishedAt: true,
			content: true,
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
	// The write-up and the transcript stay on the session page that reads them.
	sessions: {
		select: {
			index: true,
			scheduledAt: true,
			rescheduledAt: true,
			curatorJoinedAt: true,
			endedAt: true,
			contentStatus: true,
		},
	},
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

export const toArtifactRef = ({
	id,
	name,
	type,
	link,
	checkStatus,
}: Pick<
	EvidenceArtifact,
	"id" | "name" | "type" | "link" | "checkStatus"
>): CheckpointArtifactRef => ({
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

export const pulseCell = (
	sprint: number,
	member: Pick<TeamMemberRow, "startedAt" | "finishedAt">,
	pulse: Pick<PulseRow, "confirmedAt" | "source"> | undefined,
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
	events: ActivityEvent[],
): CheckpointPulseRowDto[] => {
	const now = new Date();
	const byMemberAndSprint = new Map(
		pulses.map((pulse) => [`${pulse.teamMemberId}:${pulse.week}`, pulse]),
	);
	const userOf = new Map(members.map((member) => [member.id, member.user.id]));
	const active = startedAt
		? activeDaysByUser(startedAt, [
				...events,
				...pulses.flatMap((pulse) => {
					const userId = userOf.get(pulse.teamMemberId);
					return userId && pulse.confirmedAt
						? [{ userId, at: pulse.confirmedAt }]
						: [];
				}),
			])
		: new Map<string, number[]>();

	return members.map((member) => ({
		memberId: member.id,
		userId: member.user.id,
		name: member.user.name,
		image: member.user.image,
		role: member.speciality?.name ?? member.position,
		joinedAt: member.startedAt.toISOString(),
		leftAt: member.finishedAt?.toISOString() ?? null,
		activeDays: active.get(member.user.id) ?? [],
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
	const {
		artifacts,
		curator,
		items,
		project,
		pulses,
		reports,
		sessions,
		...checkpoint
	} = row;
	const { startedAt } = checkpoint;

	return {
		...checkpoint,
		curator: withCraft(curator),
		items: items.map((item) => ({
			...item,
			artifact: item.artifact ? toArtifactRef(item.artifact) : null,
		})),
		reports: reports.map((report) => ({
			...report,
			sprint: startedAt ? sprintOfDate(startedAt, report.publishedAt) : null,
		})),
		sprints: buildSprints(startedAt),
		sessions: buildSessions(startedAt, sessions),
		pulses: buildPulseRows(project.team?.members ?? [], pulses, startedAt, [
			...reports.map((report) => ({
				userId: report.authorId,
				at: report.publishedAt,
			})),
			...artifacts.flatMap((artifact) =>
				artifact.createdByUser
					? [{ userId: artifact.createdByUser.id, at: artifact.createdAt }]
					: [],
			),
		]),
		evidence: buildEvidence(items, artifacts, startedAt),
	};
};

/** The project's builds uploaded inside the 28 days, each filed in its sprint. */
const buildsDuring = async (row: {
	projectId: string;
	startedAt: Date | null;
}) => {
	const { startedAt } = row;
	if (!startedAt) return [];

	const artifacts = await prisma.projectArtifact.findMany({
		where: {
			projectId: row.projectId,
			type: ProjectArtifactType.ExecutableBuild,
			createdAt: {
				gte: utcStartOfDay(startedAt),
				lt: dateOfDay(startedAt, CHECKPOINT_DAYS + 1),
			},
		},
		select: { id: true, createdAt: true },
	});

	return artifacts.flatMap((artifact) => {
		const sprint = sprintOfDate(startedAt, artifact.createdAt);

		return sprint === null
			? []
			: [
					{
						id: artifact.id,
						addedAt: artifact.createdAt.toISOString(),
						sprint,
					},
				];
	});
};

export const getCheckpoint = async (id: string) => {
	const row = await prisma.projectCheckpoint.findUnique({
		where: { id },
		select: checkpointDetailSelect,
	});

	if (!row) return null;

	// Only a checkpoint carrying a payment can hold money a replacement must match.
	const [held, number, builds] = await Promise.all([
		row.paymentId ? heldAmount(id) : null,
		// A draft has no number yet and no sprints to file builds in.
		row.status === CheckpointStatus.Draft ? undefined : checkpointNumber(row),
		row.status === CheckpointStatus.Draft ? [] : buildsDuring(row),
	]);

	return {
		...toCheckpointDetail(row),
		number,
		builds,
		heldPrice: held === null ? null : toWholePrice(held),
	};
};

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
			status: { in: [CheckpointStatus.Draft, ...CHECKPOINT_OPEN_STATUSES] },
		},
		orderBy: { createdAt: "desc" },
		select: currentCheckpointSelect,
	});

	if (!row) return null;

	const { reports, pulses, project, curator, ...checkpoint } = row;
	const { startedAt } = checkpoint;

	return {
		...checkpoint,
		paymentFailed: await paymentFailed(checkpoint),
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
				.map((item) => ({ cut: item.cut, hasArtifact: !!item.artifact })),
		}),
	};
};

/**
 * Why a project cannot start another checkpoint, or null when it can.
 *
 * A draft does not block — it *is* the attempt in progress, and the list offers
 * it back as `Continue` rather than pretending nothing is there.
 */
export const getCreationBlocker = async (projectId: string) => {
	const open = await prisma.projectCheckpoint.findFirst({
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
			select: checkpointSelect,
		}),
		prisma.projectCheckpoint.count({ where }),
	]);

	return { rows, total, page, limit };
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

	return prisma.projectCheckpoint.create({
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
		artifactId: item.artifactId,
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
				select: { text: true, artifactId: true },
			},
		},
	});

	return previous?.items ?? [];
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
