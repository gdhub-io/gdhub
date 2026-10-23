import type { Prisma } from "@gdhub-io/gdhub-prisma";
import { CheckpointJournalKind } from "@/config/prisma-enums";
import { prisma } from "@/services/prisma";

/**
 * One line of the AI curator's journal (GDHUB-110): what it looked at, wrote or
 * decided. Admins follow a review or a verdict back to its inputs through it, and
 * the curator reads its own looks back from it — what a devlog's media showed,
 * what was already seen, the video spent. Never throws: a lost line costs a
 * second look, a thrown one would cost the review.
 */
export const journal = (
	entry: Prisma.CheckpointJournalEntryUncheckedCreateInput,
) =>
	prisma.checkpointJournalEntry
		.create({ data: entry })
		.catch((error) =>
			console.error("[curator-journal] not written", entry.checkpointId, error),
		);

/** Every link looked at in one sprint, across artifacts and devlogs. */
export const sprintLooks = (checkpointId: string, sprint: number) =>
	prisma.checkpointJournalEntry.findMany({
		where: {
			checkpointId,
			sprint,
			kind: {
				in: [CheckpointJournalKind.Evidence, CheckpointJournalKind.DevlogMedia],
			},
		},
		select: { kind: true, devlogId: true, link: true, input: true },
	});

/** Seconds of video those looks spent: the sprint's budget is shared. */
export const videoSecondsOf = (looks: { input: unknown }[]) =>
	looks.reduce(
		(sum, look) =>
			sum +
			((look.input as { videoSeconds?: number } | null)?.videoSeconds ?? 0),
		0,
	);

/** The whole journal of a checkpoint, newest first. */
export const getJournal = (checkpointId: string) =>
	prisma.checkpointJournalEntry.findMany({
		where: { checkpointId },
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			kind: true,
			sprint: true,
			link: true,
			input: true,
			output: true,
			createdAt: true,
		},
	});
