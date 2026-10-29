import { useTranslate } from "@tolgee/react";
import { StatusDot } from "@/components/ui";
import { CheckpointStatus } from "@/config/prisma-enums";
import { isDeclined } from "@/lib/checkpoints/draft";
import type { CheckpointDto } from "@/types/checkpoints";
import { VerdictChip } from "../VerdictChip";
import styles from "./style.module.scss";

export type CheckpointStatusSlotProps = {
	checkpoint: Pick<
		CheckpointDto,
		"status" | "verdict" | "day" | "curatorDeclinedAt" | "curator"
	>;
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

	// Paid for, and the person asked to run it has not answered. Saying "Day 1"
	// here would claim the 28 days had started when nobody has taken them on.
	if (checkpoint.status === CheckpointStatus.AwaitingCurator) {
		return (
			<StatusDot
				tone="info"
				label={t(
					"checkpoints.status.awaitingCurator",
					"Waiting for the curator",
				)}
				className={className}
			/>
		);
	}

	// A draft again, but not a fresh one: somebody was asked and said no, and
	// "Draft" would hide the one fact the author has to act on.
	if (isDeclined(checkpoint)) {
		return (
			<StatusDot
				tone="warning"
				label={t("checkpoints.status.declined", "Expert unavailable")}
				className={className}
			/>
		);
	}

	// A status is a dot and a word, never a filled pill — the day is the one
	// exception, because it is a figure rather than a state.
	if (checkpoint.status === CheckpointStatus.Draft) {
		return (
			<StatusDot
				tone="neutral"
				label={t("checkpoints.draft.chip", "Draft")}
				className={className}
			/>
		);
	}

	return (
		<span className={`${styles.chip}${className ? ` ${className}` : ""}`}>
			{t("checkpoints.status.day", "Day {day} of 28", {
				day: checkpoint.day ?? 1,
			})}
		</span>
	);
}
