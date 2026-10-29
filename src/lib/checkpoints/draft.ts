import {
	CheckpointCuratorKind,
	CheckpointItemKind,
	CheckpointStatus,
} from "@/config/prisma-enums";
import type { CheckpointDto } from "@/types/checkpoints";

/** The three answers a draft needs before it can be paid for. */
export type DraftPiece = "goal" | "curator" | "startDate";

/**
 * What the draft is still short of, in the order the purchase asks for it.
 *
 * `curatorKind` is `AI` from the moment the draft is created, so an AI curator
 * cannot be told apart from one nobody has chosen yet — only a human curator
 * that has not been picked reads as missing. The draft has no record of which
 * questions were visited; giving it one is GDHUB-58.
 */
export const draftMissing = (
	checkpoint: Pick<
		CheckpointDto,
		"goal" | "curatorKind" | "curator" | "startedAt" | "items"
	>,
): DraftPiece[] => {
	const missing: DraftPiece[] = [];

	const outcomes = checkpoint.items.filter(
		(item) => item.kind === CheckpointItemKind.Outcome,
	);

	if (!checkpoint.goal.trim() || !outcomes.length) missing.push("goal");

	if (
		checkpoint.curatorKind === CheckpointCuratorKind.Human &&
		!checkpoint.curator
	) {
		missing.push("curator");
	}

	if (!checkpoint.startedAt) missing.push("startDate");

	return missing;
};

type DraftState = Pick<
	CheckpointDto,
	"status" | "paymentId" | "curatorDeclinedAt" | "curator"
>;

/** A draft as it was made: never paid for, never handed back. */
export const isFreshDraft = (checkpoint: Omit<DraftState, "curator">) =>
	checkpoint.status === CheckpointStatus.Draft &&
	!checkpoint.paymentId &&
	!checkpoint.curatorDeclinedAt;

/**
 * Paid for, a draft again and carrying nobody: the only way a checkpoint
 * reaches that is a curator handing it back.
 */
export const isDeclined = (
	checkpoint: Pick<DraftState, "status" | "curatorDeclinedAt" | "curator">,
) =>
	checkpoint.status === CheckpointStatus.Draft &&
	!!checkpoint.curatorDeclinedAt &&
	!checkpoint.curator;
