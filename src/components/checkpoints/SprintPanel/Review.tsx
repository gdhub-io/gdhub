"use client";

import { IconMessage2 } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Flex, Typography } from "antd";
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
				<div className={styles.card}>
					<Flex
						align="center"
						justify="space-between"
						gap={12}
						className={styles.cardHead}
					>
						<Typography.Text className={styles.cardTitle}>
							{t(
								"checkpoints.review.title",
								"The curator's review of the sprint",
							)}
						</Typography.Text>
						{!!facts.review.at && (
							<Typography.Text type="secondary" className={styles.cardMeta}>
								{dayjs(facts.review.at).format("D MMM")}
							</Typography.Text>
						)}
					</Flex>
					<div className={styles.prose}>{facts.review.text}</div>
				</div>
			)}

			{!!facts.scopeNote && (
				<div className={styles.card}>
					<Flex
						align="center"
						justify="space-between"
						gap={12}
						className={styles.cardHead}
					>
						<Typography.Text className={styles.cardTitle}>
							{t("checkpoints.midnote.title", "Day 14 — the scope note")}
						</Typography.Text>
						<Typography.Text type="secondary" className={styles.cardMeta}>
							{t("checkpoints.midnote.open", "open")}
						</Typography.Text>
					</Flex>
					<div className={styles.prose}>{facts.scopeNote}</div>
				</div>
			)}
		</Flex>
	);
}
