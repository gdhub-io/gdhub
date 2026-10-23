import { CHECKPOINT_OPEN_STATUSES } from "@/config/checkpoint";
import { ArtifactCheckStatus, CheckpointStatus } from "@/config/prisma-enums";
import { isSanityImage } from "@/helpers/image";
import { openLink } from "@/services/artifact-check/safe-fetch";
import { prisma } from "@/services/prisma";

/** A check that `after()` never finished is picked up by the next cron run. */
const STUCK_AFTER_MS = 10 * 60 * 1000;
/** Checked this recently, the verdict trusts it rather than fetching again. */
const FRESH_FOR_MS = 60 * 60 * 1000;
const SWEEP_BATCH = 50;
/** Links checked at once: each can take seconds, and the cron runs reviews after. */
const PARALLEL = 5;

/** Whether the artifact's link opens; the result is written onto the row. */
export async function checkArtifact(artifactId: string) {
	const artifact = await prisma.projectArtifact.findUnique({
		where: { id: artifactId },
		select: { link: true },
	});
	if (!artifact) return;

	// Our own uploads open by construction.
	const result = isSanityImage(artifact.link)
		? ({ ok: true } as const)
		: await openLink(artifact.link);

	await prisma.projectArtifact.update({
		where: { id: artifactId },
		data: {
			checkStatus: result.ok
				? ArtifactCheckStatus.Readable
				: ArtifactCheckStatus.Unreachable,
			checkedAt: new Date(),
			checkNote: result.ok ? null : result.reason,
		},
	});
}

/** A few at a time, and one failure never stops the rest. */
async function checkAll(ids: string[]) {
	for (let i = 0; i < ids.length; i += PARALLEL) {
		await Promise.allSettled(ids.slice(i, i + PARALLEL).map(checkArtifact));
	}
}

/**
 * The cron's share: checks `after()` never finished, and artifacts on running
 * checkpoints that were never checked. Closed checkpoints are left alone.
 */
export async function sweepArtifactChecks() {
	const stuck = await prisma.projectArtifact.findMany({
		where: {
			OR: [
				{
					checkStatus: ArtifactCheckStatus.Pending,
					updatedAt: { lt: new Date(Date.now() - STUCK_AFTER_MS) },
				},
				{
					checkStatus: null,
					checkpointItems: {
						some: {
							checkpoint: {
								status: {
									in: [CheckpointStatus.Draft, ...CHECKPOINT_OPEN_STATUSES],
								},
							},
						},
					},
				},
			],
		},
		select: { id: true },
		take: SWEEP_BATCH,
	});

	await checkAll(stuck.map((artifact) => artifact.id));
	return stuck.length;
}

/** Links rot and permissions change: everything on the card, again, before the verdict. */
export async function recheckCheckpointArtifacts(checkpointId: string) {
	const items = await prisma.checkpointItem.findMany({
		where: {
			checkpointId,
			artifact: {
				OR: [
					{ checkedAt: null },
					{ checkedAt: { lt: new Date(Date.now() - FRESH_FOR_MS) } },
				],
			},
		},
		select: { artifactId: true },
	});

	await checkAll([...new Set(items.flatMap((item) => item.artifactId ?? []))]);
}
