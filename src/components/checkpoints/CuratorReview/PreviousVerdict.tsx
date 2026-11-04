"use client";

import { IconFlag } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Typography } from "antd";
import Link from "next/link";
import callStyles from "@/components/checkpoints/CallRoom/style.module.scss";
import {
	useVerdictCopy,
	VERDICT_TONE,
} from "@/components/checkpoints/VerdictChip";
import { IconTile, StatusDot } from "@/components/ui";
import type { PreviousVerdict as PreviousVerdictDto } from "@/types/checkpoints";
import styles from "./style.module.scss";

/**
 * Frame WHjfJ: the last checkpoint's verdict, above the goal through the first
 * sprint — where this one starts from. `resultsHref` is the team's way to the
 * full results; a pro curator outside the project reads the note alone.
 */
export function PreviousVerdict({
	previous,
	resultsHref,
}: {
	previous: PreviousVerdictDto;
	resultsHref?: string;
}) {
	const { t } = useTranslate();
	const { label } = useVerdictCopy();

	return (
		<section className={callStyles.goal}>
			<IconTile icon={IconFlag} size="sm" />
			<div className={callStyles.goalText}>
				<div className={styles.previousHead}>
					<Typography.Text type="secondary" className={styles.small}>
						{t(
							"checkpoints.review.previous.label",
							"Checkpoint {number} · the verdict",
							{ number: previous.number },
						)}
					</Typography.Text>
					<StatusDot
						tone={VERDICT_TONE[previous.verdict]}
						label={label(previous.verdict)}
					/>
				</div>
				{previous.note && <Typography.Text>{previous.note}</Typography.Text>}
			</div>
			{resultsHref && (
				<Link href={resultsHref} className={styles.resultsLink}>
					{t("workflow.path.check.view-results", "View results")}
				</Link>
			)}
		</section>
	);
}
