"use client";

import { IconMessage2 } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { App, Button, Card, Flex, Input, Typography } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { useWriteReview } from "@/hooks/checkpoints";
import type { SprintFacts } from "@/lib/checkpoint-facts";
import styles from "./style.module.scss";

export type ReviewProps = {
	facts: SprintFacts;
	/** Set for the curator running it: the one thing they may write here. */
	checkpointId?: string;
	writable?: boolean;
};

/**
 * One review per sprint, and it reviews the sprint rather than answering the
 * devlog. Until the schema holds a review of its own it is read off the sprint's
 * devlog, which is why a sprint without one shows nothing here.
 */
export function Review({ facts, checkpointId, writable }: ReviewProps) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const [draft, setDraft] = useState("");
	const write = useWriteReview(checkpointId);

	const devlogId = facts.devlog?.id;

	const save = async () => {
		if (!devlogId || !draft.trim()) return;

		try {
			await write.mutateAsync({ devlogId, text: draft });
			setDraft("");
		} catch {
			message.error(
				t("checkpoints.review.saveFailed", "The review was not saved"),
			);
		}
	};

	// A sprint nobody wrote a devlog for has nothing to hang a review on — the
	// storage is a field on the devlog until the schema holds a review of its own.
	const form = writable && !facts.review && (
		<Card
			size="small"
			title={
				<span className={styles.cardTitle}>
					{t("checkpoints.review.write", "Your review of this sprint")}
				</span>
			}
		>
			{devlogId ? (
				<Flex vertical gap={12} align="flex-end">
					<Input.TextArea
						value={draft}
						onChange={(event) => setDraft(event.target.value)}
						rows={5}
						maxLength={4000}
						placeholder={t(
							"checkpoints.review.placeholder",
							"What moved, what is in the way, what you would do next.",
						)}
					/>
					<Button
						type="primary"
						loading={write.isPending}
						disabled={!draft.trim()}
						onClick={save}
					>
						{t("checkpoints.review.publish", "Publish the review")}
					</Button>
				</Flex>
			) : (
				<Typography.Text type="secondary">
					{t(
						"checkpoints.review.noDevlog",
						"There is no devlog for this sprint yet, and a review is written under one.",
					)}
				</Typography.Text>
			)}
		</Card>
	);

	if (!facts.review && !facts.scopeNote && !form)
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
			{form}

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
