"use client";

import { IconMessage2 } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Card, Typography } from "antd";
import { EmptyState } from "@/components/ui/EmptyState";
import type { SprintFacts } from "@/lib/checkpoints/facts";
import { CHECKPOINT_SCOPE_DAY } from "@/lib/checkpoints/scope";
import styles from "./style.module.scss";

export type ReviewProps = {
	facts: SprintFacts;
};

/** The day-15 scope note, on the sprint it falls in, until it is answered. */
export function Review({ facts }: ReviewProps) {
	const { t } = useTranslate();

	if (!facts.scopeNote)
		return (
			<EmptyState
				icon={IconMessage2}
				title={t("checkpoints.review.empty", "No review yet")}
				description={t(
					"checkpoints.review.emptyNoteAI",
					"The AI curator will go through the project's activity and write the review.",
				)}
			/>
		);

	return (
		<Card
			size="small"
			styles={{ body: { padding: 0 } }}
			title={
				<span className={styles.cardTitle}>
					{t("checkpoints.midnote.title", "Day {day} — the scope note", {
						day: CHECKPOINT_SCOPE_DAY,
					})}
				</span>
			}
			extra={
				<Typography.Text type="secondary" className={styles.cardMeta}>
					{t("checkpoints.midnote.open", "open")}
				</Typography.Text>
			}
		>
			<div className={styles.prose}>{facts.scopeNote}</div>
		</Card>
	);
}
