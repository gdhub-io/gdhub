import { CheckpointVerdict } from "@/config/prisma-enums";

/**
 * `GoalMissed` is warning, not danger. Red belongs to destructive and failed
 * platform actions; a missed goal is the starting position of the next
 * checkpoint, and the product should not shout at a team for it.
 */
export const VERDICT_TONE = {
	[CheckpointVerdict.StageClosed]: "success",
	[CheckpointVerdict.GoalMet]: "info",
	[CheckpointVerdict.GoalMissed]: "warning",
} as const satisfies Record<CheckpointVerdict, string>;
