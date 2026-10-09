import { useTranslate } from "@tolgee/react";
import { StatusDot, type StatusTone } from "@/components/ui";
import { CheckpointVerdict } from "@/config/prisma-enums";

/**
 * `GoalMissed` is warning, not danger. Red belongs to destructive and failed
 * platform actions; a missed goal is the starting position of the next
 * checkpoint, and the product should not shout at a team for it.
 */
const TONE: Record<CheckpointVerdict, StatusTone> = {
	[CheckpointVerdict.StageClosed]: "success",
	[CheckpointVerdict.GoalMet]: "info",
	[CheckpointVerdict.GoalMissed]: "warning",
};

export type VerdictChipProps = {
	verdict: CheckpointVerdict;
	className?: string;
};

export function VerdictChip({ verdict, className }: VerdictChipProps) {
	const { t } = useTranslate();

	const label = {
		[CheckpointVerdict.StageClosed]: t(
			"checkpoints.verdict.stageClosed",
			"Stage can be closed",
		),
		[CheckpointVerdict.GoalMet]: t("checkpoints.verdict.goalMet", "Goal met"),
		[CheckpointVerdict.GoalMissed]: t(
			"checkpoints.verdict.goalMissed",
			"Goal missed",
		),
	}[verdict];

	return <StatusDot tone={TONE[verdict]} label={label} className={className} />;
}
