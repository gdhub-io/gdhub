import { CheckpointCuratorKind, CheckpointStatus } from "@/config/prisma-enums";
import { utcStartOfDay } from "@/lib/checkpoints/days";
import {
	CHECKPOINT_RUNNING_STATUSES,
	checkpointMove,
} from "@/lib/checkpoints/status";
import { journalCuratorVerdict } from "@/repositories/checkpoints/ai-curator";
import { recordCheckpointFee } from "@/repositories/checkpoints/fee";
import {
	type CuratorVerdictInput,
	type CuratorVerdictResult,
	writeUndecided,
} from "@/repositories/checkpoints/verdict";
import { issueCheckpointCertificate } from "@/services/certificates";
import { closeCheckpointRoom, syncChat } from "@/services/chat/checkpoint-room";
import {
	notifyVerdictDue,
	notifyVerdictSent,
} from "@/services/checkpoints/verdict-notifications";
import { prisma } from "@/services/prisma";

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
			...checkpointMove(CHECKPOINT_RUNNING_STATUSES, CheckpointStatus.Closed)
				.data,
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

/**
 * The 28 days are over: the checkpoint waits for its verdict. Day 28 is the
 * `dueAt` day, so a checkpoint moves on the first run after that day ends,
 * whoever curates it, and its human curator is told what is due. Until it
 * moves, the project cannot buy the next one.
 */
export async function moveFinishedToReview(now = new Date()) {
	const move = checkpointMove(CheckpointStatus.Active, CheckpointStatus.Review);
	const moved = await prisma.projectCheckpoint.updateManyAndReturn({
		where: { ...move.where, dueAt: { lt: utcStartOfDay(now) } },
		data: move.data,
		select: { id: true, curatorKind: true },
	});

	await notifyVerdictDue(
		moved
			.filter((row) => row.curatorKind === CheckpointCuratorKind.Human)
			.map((row) => row.id),
	);

	return moved.length;
}
