import { useTranslate } from "@tolgee/react";
import { StatusDot, type StatusTone } from "@/components/ui";
import { CheckpointVerdict } from "@/config/prisma-enums";

/**
 * `GoalMissed` is warning, not danger. Red belongs to destructive and failed
 * platform actions; a missed goal is the starting position of the next
 * checkpoint, and the product should not shout at a team for it.
 */
export const VERDICT_TONE: Record<CheckpointVerdict, StatusTone> = {
	[CheckpointVerdict.StageClosed]: "success",
	[CheckpointVerdict.GoalMet]: "info",
	[CheckpointVerdict.GoalMissed]: "warning",
};

/** The order the curator is offered them in (frame `vC7gn`). */
export const VERDICT_ORDER = [
	CheckpointVerdict.GoalMet,
	CheckpointVerdict.GoalMissed,
	CheckpointVerdict.StageClosed,
] as const;

/**
 * A verdict's name and what it means for the project, read the same by the
 * curator choosing it and by the author receiving it. The stages are named
 * when known; the author's side may not have them to hand.
 */
export function useVerdictCopy() {
	const { t } = useTranslate();

	const label = (verdict: CheckpointVerdict) =>
		({
			[CheckpointVerdict.StageClosed]: t(
				"checkpoints.verdict.nextStage",
				"Ready for the next stage",
			),
			[CheckpointVerdict.GoalMet]: t("checkpoints.verdict.goalMet", "Goal met"),
			[CheckpointVerdict.GoalMissed]: t(
				"checkpoints.verdict.goalMissed",
				"Goal missed",
			),
		})[verdict];

	const meaning = (
		verdict: CheckpointVerdict,
		stages?: { from: string; to: string },
	) =>
		({
			[CheckpointVerdict.StageClosed]: stages
				? t(
						"checkpoints.verdict.nextStageMeaning",
						"Goal met. The project may move from {from} to {to}.",
						stages,
					)
				: t(
						"checkpoints.verdict.nextStageMeaningShort",
						"Goal met. The project may move to the next stage.",
					),
			[CheckpointVerdict.GoalMet]: t(
				"checkpoints.verdict.goalMetMeaning",
				"Outcomes are complete. The project stays on this stage; continue with a new checkpoint.",
			),
			[CheckpointVerdict.GoalMissed]: t(
				"checkpoints.verdict.goalMissedMeaning",
				"Outcomes are incomplete. Continue with a new checkpoint.",
			),
		})[verdict];

	return { label, meaning };
}

export type VerdictChipProps = {
	verdict: CheckpointVerdict;
	className?: string;
};

export function VerdictChip({ verdict, className }: VerdictChipProps) {
	const { label } = useVerdictCopy();

	return (
		<StatusDot
			tone={VERDICT_TONE[verdict]}
			label={label(verdict)}
			className={className}
		/>
	);
}
