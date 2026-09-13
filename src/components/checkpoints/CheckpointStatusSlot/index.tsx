import { useTranslate } from "@tolgee/react";
import { StatusDot } from "@/components/ui";
import { CheckpointStatus } from "@/config/prisma-enums";
import type { CheckpointDto } from "@/types/checkpoints";
import { VerdictChip } from "../VerdictChip";
import styles from "./style.module.scss";

export type CheckpointStatusSlotProps = {
	checkpoint: Pick<CheckpointDto, "status" | "verdict" | "day">;
	className?: string;
};

/**
 * One slot with three faces: the day counter while the 28 days run, `Awaiting
 * verdict` between day 28 and the decision, the verdict once it lands.
 *
 * The day number is the status — not the word "Active" — because it is the
 * number the author came for. It arrives counted on the server; a browser in
 * another timezone must not disagree about which day it is.
 */
export function CheckpointStatusSlot({
	checkpoint,
	className,
}: CheckpointStatusSlotProps) {
	const { t } = useTranslate();

	if (checkpoint.verdict) {
		return <VerdictChip verdict={checkpoint.verdict} className={className} />;
	}

	if (checkpoint.status === CheckpointStatus.Review) {
		return (
			<StatusDot
				tone="warning"
				label={t("checkpoints.status.awaitingVerdict", "Awaiting verdict")}
				className={className}
			/>
		);
	}

	if (checkpoint.status === CheckpointStatus.Draft) {
		return (
			<StatusDot
				tone="neutral"
				label={t("checkpoints.draft.chip", "Draft")}
				className={className}
			/>
		);
	}

	// The day is a number, not a state, so it takes the chip rather than the dot
	// the verdicts use. It also stands where the word "Active" would otherwise
	// be, because it is the number the author came for.
	return (
		<span className={`${styles.day}${className ? ` ${className}` : ""}`}>
			{t("checkpoints.status.day", "Day {day} of 28", {
				day: checkpoint.day ?? 1,
			})}
		</span>
	);
}
