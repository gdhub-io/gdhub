"use client";

import { IconMessage2 } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Card, Flex, Typography } from "antd";
import dayjs from "dayjs";
import { EmptyState } from "@/components/ui/EmptyState";
import type { SprintFacts } from "@/lib/checkpoint-facts";
import styles from "./style.module.scss";

export type ReviewProps = {
	facts: SprintFacts;
};

/**
 * One review per sprint, and it reviews the sprint rather than answering the
 * devlog. Until the schema holds a review of its own it is read off the sprint's
 * devlog, which is why a sprint without one shows nothing here.
 */
export function Review({ facts }: ReviewProps) {
	const { t } = useTranslate();

	if (!facts.review && !facts.scopeNote)
		return (
			<EmptyState
				icon={IconMessage2}
				title={t("checkpoints.review.empty", "No review yet")}
				description={t(
					"checkpoints.review.emptyNote",
					"The curator writes one for every sprint, after its devlog.",
				)}
			/>
		);

	return (
		<Flex vertical gap={16}>
			{!!facts.review && (
				<Card
					size="small"
					styles={{ body: { padding: 0 } }}
					title={
						<span className={styles.cardTitle}>
							{t(
								"checkpoints.review.title",
								"The curator's review of the sprint",
							)}
						</span>
					}
					extra={
						!!facts.review.at && (
							<Typography.Text type="secondary" className={styles.cardMeta}>
								{dayjs(facts.review.at).format("D MMM")}
							</Typography.Text>
						)
					}
				>
					<div className={styles.prose}>{facts.review.text}</div>
				</Card>
			)}

			{!!facts.scopeNote && (
				<Card
					size="small"
					styles={{ body: { padding: 0 } }}
					title={
						<span className={styles.cardTitle}>
							{t("checkpoints.midnote.title", "Day 14 — the scope note")}
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
			)}
		</Flex>
	);
}
