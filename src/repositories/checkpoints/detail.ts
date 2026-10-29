import {
	CheckpointCuratorKind,
	CheckpointStatus,
	type Prisma,
} from "@gdhub-io/gdhub-prisma";
import {
	CHECKPOINT_DAYS,
	SPRINT_BUILD_TYPES,
	SPRINTS_PER_CHECKPOINT,
} from "@/config/checkpoint";
import {
	type ActivityEvent,
	activeDaysByUser,
} from "@/lib/checkpoints/activity";
import { characterFace } from "@/lib/checkpoints/curator-characters";
import { curatorNow } from "@/lib/checkpoints/curator-now";
import { utcStartOfDay } from "@/lib/checkpoints/days";
import { dateOfDay } from "@/lib/checkpoints/plan";
import { buildSessions } from "@/lib/checkpoints/sessions";
import {
	buildSprints,
	sprintOfDate,
	sprintRange,
} from "@/lib/checkpoints/sprints";
import { checkpointLineage } from "@/repositories/checkpoints/number";
import { heldAmount, toWholePrice } from "@/repositories/checkpoints/payment";
import {
	checkpointItemSelect,
	checkpointSelect,
	curatorWithCraftSelect,
	sessionRowSelect,
	withAcceptedTerms,
	withCraft,
} from "@/repositories/checkpoints/select";
import { CONFIRMED_STATUS } from "@/repositories/scout.games";
import { prisma } from "@/services/prisma";
import type {
	CheckpointArtifactRef,
	CheckpointEvidenceDto,
	CheckpointPulseCellDto,
	CheckpointPulseRowDto,
} from "@/types/checkpoints";

/** The artifact as the evidence list needs it: the ref, plus who offered it. */
const evidenceArtifactSelect = {
	id: true,
	name: true,
	type: true,
	link: true,
	checkStatus: true,
	checkNote: true,
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
			evidence: {
				...checkpointItemSelect.evidence,
				select: {
					...checkpointItemSelect.evidence.select,
					artifact: { select: evidenceArtifactSelect },
				},
			},
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
	sessions: sessionRowSelect,
	curatorCharacter: true,
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

type EvidenceArtifact =
	DetailRow["items"][number]["evidence"][number]["artifact"];

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
	checkNote,
}: Pick<EvidenceArtifact, "id" | "name" | "type" | "link" | "checkStatus"> & {
	checkNote?: string | null;
}): CheckpointArtifactRef => ({
	id,
	name,
	type,
	link,
	checkStatus,
	checkNote: checkNote ?? null,
});

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
 * The artifacts the checkpoint's items point at. One can come from an earlier
 * checkpoint — an author may prove an outcome with something the project
 * already had.
 */
const buildEvidence = (
	items: DetailRow["items"],
	startedAt: Date | null,
): CheckpointEvidenceDto[] => {
	const byId = new Map<
		string,
		{ artifact: EvidenceArtifact; itemIds: string[] }
	>();
	for (const item of items) {
		for (const { artifact } of item.evidence) {
			const known = byId.get(artifact.id);
			if (known) known.itemIds.push(item.id);
			else byId.set(artifact.id, { artifact, itemIds: [item.id] });
		}
	}

	return [...byId.values()]
		.map(({ artifact, itemIds }) => ({
			artifact: toArtifactRef(artifact),
			addedAt: artifact.createdAt.toISOString(),
			addedBy: artifact.createdByUser,
			itemIds,
			sprint: startedAt ? sprintOfDate(startedAt, artifact.createdAt) : null,
		}))
		.sort(
			(a, b) =>
				a.addedAt.localeCompare(b.addedAt) ||
				a.artifact.id.localeCompare(b.artifact.id),
		);
};

export type Checkpoint = Awaited<ReturnType<typeof getCheckpoint>>;

/** What the AI curator says now, read with its letters; a pro's call notes stay on their page. */
const nowOfCurator = async (checkpoint: {
	id: string;
	startedAt: Date | null;
	goalAgreedAt: Date | null;
	planCheckedAt: Date | null;
	scopeConfirmedAt: Date | null;
}) => {
	const { startedAt } = checkpoint;
	if (!startedAt) return null;
	const sessions = await prisma.checkpointSession.findMany({
		where: { checkpointId: checkpoint.id },
		select: {
			index: true,
			scheduledAt: true,
			endedAt: true,
			contentStatus: true,
			content: true,
		},
	});
	return curatorNow({ ...checkpoint, startedAt, sessions });
};

/** The row as the checkpoint page reads it; the artifact joins stay behind. */
const toCheckpointDetail = (row: DetailRow) => {
	const {
		curator,
		curatorCharacter,
		items,
		project,
		pulses,
		reports,
		sessions,
		...checkpoint
	} = withAcceptedTerms(row);
	const { startedAt } = checkpoint;

	return {
		...checkpoint,
		curator: withCraft(curator),
		items: items.map((item) => ({
			...item,
			evidence: item.evidence.map((piece) => ({
				...piece,
				artifact: toArtifactRef(piece.artifact),
			})),
		})),
		reports: reports.map((report) => ({
			...report,
			sprint: startedAt ? sprintOfDate(startedAt, report.publishedAt) : null,
		})),
		sprints: buildSprints(startedAt),
		sessions: buildSessions(startedAt, sessions, checkpoint.curatorKind, {
			curatorId: curator?.id ?? null,
		}),
		character: characterFace(curatorCharacter),
		pulses: buildPulseRows(
			project.team?.members ?? [],
			pulses,
			startedAt,
			reports.map((report) => ({
				userId: report.authorId,
				at: report.publishedAt,
			})),
		),
		evidence: buildEvidence(items, startedAt),
	};
};

/** Every artifact the project added inside the 28 days, each filed in its sprint. */
const artifactsDuring = async (row: {
	projectId: string;
	startedAt: Date | null;
}) => {
	const { startedAt } = row;
	if (!startedAt) return [];

	const artifacts = await prisma.projectArtifact.findMany({
		where: {
			projectId: row.projectId,
			createdAt: {
				gte: utcStartOfDay(startedAt),
				lt: dateOfDay(startedAt, CHECKPOINT_DAYS + 1),
			},
		},
		select: { id: true, createdAt: true, type: true },
		orderBy: { createdAt: "asc" },
	});

	return artifacts.flatMap((artifact) => {
		const sprint = sprintOfDate(startedAt, artifact.createdAt);

		return sprint === null
			? []
			: [
					{
						id: artifact.id,
						addedAt: artifact.createdAt.toISOString(),
						type: artifact.type,
						sprint,
					},
				];
	});
};

/** The checkpoint as `getCheckpoint` builds it, without the reads only its author's page needs. */
export const getCheckpointCore = async (id: string) => {
	const row = await prisma.projectCheckpoint.findUnique({
		where: { id },
		select: checkpointDetailSelect,
	});

	return row && toCheckpointDetail(row);
};

export const getCheckpoint = async (id: string) => {
	const row = await prisma.projectCheckpoint.findUnique({
		where: { id },
		select: checkpointDetailSelect,
	});

	if (!row) return null;

	// Only a checkpoint carrying a payment can hold money a replacement must match.
	const [held, lineage, added, now] = await Promise.all([
		row.paymentId ? heldAmount(id) : null,
		checkpointLineage(row),
		// A draft has no sprints to file builds in.
		row.status === CheckpointStatus.Draft ? [] : artifactsDuring(row),
		row.curatorKind === CheckpointCuratorKind.AI ? nowOfCurator(row) : null,
	]);

	const detail = toCheckpointDetail(row);

	return {
		...detail,
		// The author's page links each devlog; only the curator's card reads it.
		reports: detail.reports.map(({ content: _, ...report }) => report),
		// A draft has no number yet.
		number: row.status === CheckpointStatus.Draft ? undefined : lineage.number,
		builds: added.filter((artifact) =>
			SPRINT_BUILD_TYPES[row.curatorKind].includes(artifact.type),
		),
		sprintArtifacts: added,
		curatorNow: now,
		previousCuratorKind: lineage.previousCuratorKind,
		heldPrice: held === null ? null : toWholePrice(held),
	};
};
