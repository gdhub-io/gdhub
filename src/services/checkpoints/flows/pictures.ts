import { CheckpointJournalKind } from "@/config/prisma-enums";
import { duePicturePoints } from "@/lib/checkpoints/picture";
import { CHECKPOINT_RUNNING_STATUSES } from "@/lib/checkpoints/status";
import { writePicture } from "@/repositories/checkpoints/picture";
import { seeInputArtifacts } from "@/services/checkpoints/flows/evidence-seen";
import { prisma } from "@/services/prisma";

/** Day 1's inputs looked at before its picture; a failed look never holds the picture back. */
const seeInputs = (checkpointId: string) =>
	seeInputArtifacts(checkpointId).catch((error) =>
		console.error("[checkpoint-inputs] not looked at", checkpointId, error),
	);

/**
 * Every picture whose moment has come and is not written yet (GDHUB-133). The
 * night run calls it before the reviews, so a review reads its sprint's picture;
 * a picture a failed run missed is written by the next one, with what stands then.
 */
export const writeDuePictures = async (now = new Date()) => {
	const checkpoints = await prisma.projectCheckpoint.findMany({
		where: {
			status: { in: CHECKPOINT_RUNNING_STATUSES },
			startedAt: { not: null, lte: now },
		},
		select: {
			id: true,
			startedAt: true,
			journal: {
				where: { kind: CheckpointJournalKind.Snapshot },
				select: { sprint: true },
			},
		},
	});

	let written = 0;
	for (const checkpoint of checkpoints) {
		if (!checkpoint.startedAt) continue;
		const have = new Set(checkpoint.journal.map((row) => row.sprint));
		for (const point of duePicturePoints(checkpoint.startedAt, now)) {
			if (have.has(point)) continue;
			if (point === 0) await seeInputs(checkpoint.id);
			const ok = await writePicture(checkpoint.id, point).catch((error) => {
				console.error(
					"[checkpoint-picture] failed",
					checkpoint.id,
					point,
					error,
				);
				return false;
			});
			if (ok) written += 1;
		}
	}
	return written;
};

/**
 * The moment a checkpoint starts: the day-1 inputs are looked at, then day 1's
 * picture is taken — today, or by the night run of a later start day.
 */
export const atCheckpointStart = async (
	checkpointId: string,
	now = new Date(),
) => {
	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id: checkpointId },
		select: { startedAt: true },
	});
	if (
		!checkpoint?.startedAt ||
		!duePicturePoints(checkpoint.startedAt, now).length
	)
		return false;
	await seeInputs(checkpointId);
	return writePicture(checkpointId, 0);
};
