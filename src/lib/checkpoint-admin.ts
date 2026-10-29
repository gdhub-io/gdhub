import {
	CheckpointCuratorKind,
	CheckpointStatus,
	type CheckpointVerdict,
} from "@/config/prisma-enums";
import { verdictOverdue } from "@/lib/checkpoint-verdict-window";

/**
 * When an administrator may act on a checkpoint, for the list's menu and the
 * writes behind it alike. Browser-safe.
 */

/** A person's verdict nobody sent after day 31: only then may an admin write it. */
export const adminVerdictOpen = (
	row: {
		curatorKind: CheckpointCuratorKind;
		status: CheckpointStatus;
		verdict: CheckpointVerdict | null;
		dueAt: Date | null;
	},
	now = new Date(),
) =>
	row.curatorKind === CheckpointCuratorKind.Human &&
	row.status === CheckpointStatus.Review &&
	!row.verdict &&
	!!row.dueAt &&
	verdictOverdue(row.dueAt, now);

/** A draft holds what a payment would buy: a goal and something that exists. */
export const draftComplete = (row: { goal: string; inputs: number }) =>
	!!row.goal.trim() && row.inputs > 0;
