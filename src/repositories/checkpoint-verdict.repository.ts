import type { Prisma } from "@gdhub-io/gdhub-prisma";
import { FINAL_SESSION } from "@/config/checkpoint";
import {
	CheckpointCuratorKind,
	CheckpointStatus,
	type CheckpointVerdict,
	ProjectArtifactType,
} from "@/config/prisma-enums";
import { utcStartOfDay } from "@/lib/checkpoint-days";
import {
	type VerdictStage,
	verdictStage,
} from "@/lib/checkpoint-verdict-window";
import {
	getVerdictRead,
	journalCuratorVerdict,
} from "@/repositories/checkpoint-curator.repository";
import { recordCheckpointFee } from "@/repositories/checkpoint-fee";
import { issueCheckpointCertificate } from "@/services/certificates";
import { closeCheckpointRoom, syncChat } from "@/services/chat/checkpoint-room";
import {
	notifyVerdictDue,
	notifyVerdictSent,
} from "@/services/checkpoint-verdict-notifications";
import { prisma } from "@/services/prisma";

export type CuratorVerdictInput = {
	verdict: CheckpointVerdict;
	note: string;
};

export type VerdictDraftInput = {
	verdict: CheckpointVerdict | null;
	note: string;
};

export type CuratorVerdictResult =
	| { ok: true }
	| { ok: false; reason: "notFound" | "notOpen" | "alreadyDecided" };

const UNDECIDED: CheckpointStatus[] = [
	CheckpointStatus.Active,
	CheckpointStatus.Review,
];

/**
 * The curator's own checkpoint, asked for by both ids at once so one somebody
 * else curates reads as missing rather than as forbidden. The AI curator's
 * checkpoints never reach this file.
 */
const curatedBy = (checkpointId: string, curatorId: string) => ({
	id: checkpointId,
	curatorId,
	curatorKind: CheckpointCuratorKind.Human,
});

const windowSelect = {
	status: true,
	verdict: true,
	startedAt: true,
	sessions: {
		where: { index: FINAL_SESSION },
		select: { scheduledAt: true, curatorJoinedAt: true },
	},
} as const;

const stageOf = (
	row: {
		status: CheckpointStatus;
		verdict: CheckpointVerdict | null;
		startedAt: Date | null;
		sessions: { scheduledAt: Date; curatorJoinedAt: Date | null }[];
	},
	now: Date,
) =>
	row.verdict || !row.startedAt || !UNDECIDED.includes(row.status)
		? null
		: verdictStage(row.startedAt, row.sessions[0] ?? null, now);

/**
 * Writes to the curator's own undecided checkpoint when `allowed` holds for
 * what they may do now. The write repeats the read's conditions, so two
 * submits racing each other find nothing to update the second time.
 */
async function writeUndecided(
	checkpointId: string,
	curatorId: string,
	now: Date,
	allowed: (stage: VerdictStage | null) => boolean,
	data: Prisma.ProjectCheckpointUpdateManyMutationInput,
): Promise<CuratorVerdictResult> {
	const row = await prisma.projectCheckpoint.findFirst({
		where: curatedBy(checkpointId, curatorId),
		select: windowSelect,
	});

	if (!row) return { ok: false, reason: "notFound" };
	if (row.verdict) return { ok: false, reason: "alreadyDecided" };
	if (!allowed(stageOf(row, now))) return { ok: false, reason: "notOpen" };

	const { count } = await prisma.projectCheckpoint.updateMany({
		where: {
			...curatedBy(checkpointId, curatorId),
			status: { in: UNDECIDED },
			verdict: null,
		},
		data,
	});

	return count === 0 ? { ok: false, reason: "alreadyDecided" } : { ok: true };
}

/**
 * Sends the verdict, which closes the checkpoint (frame `vC7gn`). The curator
 * chooses freely; only the time is checked — from the start of the final call.
 */
export async function writeCuratorVerdict(
	checkpointId: string,
	curatorId: string,
	{ verdict, note }: CuratorVerdictInput,
	now = new Date(),
): Promise<CuratorVerdictResult> {
	const result = await writeUndecided(
		checkpointId,
		curatorId,
		now,
		(stage) => stage === "send",
		{
			status: CheckpointStatus.Closed,
			verdict,
			verdictNote: note,
			decidedAt: now,
			decidedById: curatorId,
			verdictDraft: null,
			verdictDraftNote: null,
			verdictDraftAt: null,
		},
	);

	if (result.ok) {
		await journalCuratorVerdict(checkpointId, verdict, note);
		await afterVerdictSent(checkpointId);
	}

	return result;
}

/** A sent verdict closes the chat, tells the team, issues the certificate and the curator's fee. */
export const afterVerdictSent = (checkpointId: string) =>
	Promise.all([
		syncChat(`verdict ${checkpointId}`, () =>
			closeCheckpointRoom(checkpointId),
		),
		notifyVerdictSent(checkpointId),
		issueCheckpointCertificate(checkpointId).catch((error) =>
			console.error(`[certificate] checkpoint ${checkpointId}`, error),
		),
		recordCheckpointFee(checkpointId).catch((error) =>
			console.error(`[fee] checkpoint ${checkpointId}`, error),
		),
	]);

/** Saves the unsent verdict, from sprint 4 until it is sent. Only the curator reads it. */
export const saveVerdictDraft = (
	checkpointId: string,
	curatorId: string,
	{ verdict, note }: VerdictDraftInput,
	now = new Date(),
) =>
	writeUndecided(
		checkpointId,
		curatorId,
		now,
		(stage) => stage === "draft" || stage === "send",
		{ verdictDraft: verdict, verdictDraftNote: note, verdictDraftAt: now },
	);

const domainOf = (link: string) => {
	try {
		return new URL(link).hostname.replace(/^www\./, "");
	} catch {
		return null;
	}
};

/**
 * What the verdict modal needs beyond the checkpoint card: the draft, the
 * times, the stage the project would move to, and the last build of the 28
 * days. Null for anyone but the checkpoint's own human curator.
 */
export async function getVerdictContext(
	checkpointId: string,
	curatorId: string,
	now = new Date(),
) {
	const row = await prisma.projectCheckpoint.findFirst({
		where: curatedBy(checkpointId, curatorId),
		select: {
			...windowSelect,
			projectId: true,
			dueAt: true,
			stageName: true,
			verdictDraft: true,
			verdictDraftNote: true,
			verdictDraftAt: true,
			step: {
				select: {
					order: true,
					projectWorkflow: { select: { id: true, title: true } },
				},
			},
		},
	});

	if (!row) return null;

	const [next, build, aiRead] = await Promise.all([
		row.step
			? prisma.projectWorkflowStep.findFirst({
					where: {
						projectWorkflowId: row.step.projectWorkflow.id,
						order: { gt: row.step.order },
					},
					orderBy: { order: "asc" },
					select: { order: true, name: true },
				})
			: null,
		row.startedAt && row.dueAt
			? prisma.projectArtifact.findFirst({
					where: {
						projectId: row.projectId,
						type: ProjectArtifactType.ExecutableBuild,
						createdAt: { gte: row.startedAt, lte: now },
					},
					orderBy: { createdAt: "desc" },
					select: { name: true, link: true, createdAt: true },
				})
			: null,
		getVerdictRead(checkpointId),
	]);

	const stageKey = (order: number) =>
		`workflow.${row.step?.projectWorkflow.title}.step${order + 1}.name`;

	return {
		stage: stageOf(row, now),
		dueAt: row.dueAt,
		draft: row.verdictDraftAt
			? {
					verdict: row.verdictDraft,
					note: row.verdictDraftNote ?? "",
					savedAt: row.verdictDraftAt,
				}
			: null,
		finalCall: row.sessions[0] ?? null,
		currentStage: {
			name: row.stageName,
			key: row.step ? stageKey(row.step.order) : null,
		},
		nextStage: next ? { name: next.name, key: stageKey(next.order) } : null,
		aiRead,
		lastBuild: build
			? {
					name: build.name,
					link: build.link,
					domain: domainOf(build.link),
					createdAt: build.createdAt,
				}
			: null,
	};
}

/**
 * The 28 days are over: the checkpoint waits for its verdict. Day 28 is the
 * `dueAt` day, so a checkpoint moves on the first run after that day ends,
 * whoever curates it, and its human curator is told what is due. Until it
 * moves, the project cannot buy the next one.
 */
export async function moveFinishedToReview(now = new Date()) {
	const moved = await prisma.projectCheckpoint.updateManyAndReturn({
		where: {
			status: CheckpointStatus.Active,
			dueAt: { lt: utcStartOfDay(now) },
		},
		data: { status: CheckpointStatus.Review },
		select: { id: true, curatorKind: true },
	});

	await notifyVerdictDue(
		moved
			.filter((row) => row.curatorKind === CheckpointCuratorKind.Human)
			.map((row) => row.id),
	);

	return moved.length;
}
