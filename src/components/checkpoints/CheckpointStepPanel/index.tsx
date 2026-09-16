"use client";

import { IconHourglass, IconLock } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Card, Flex, Typography } from "antd";
import dayjs from "dayjs";
import { EmptyState } from "@/components/ui/EmptyState";
import { CheckpointItemKind, CheckpointStatus } from "@/config/prisma-enums";
import type { CheckpointDto } from "@/types/checkpoints";
import { VerdictChip } from "../VerdictChip";
import styles from "./style.module.scss";

export type CheckpointStepPanelProps = {
	checkpoint: CheckpointDto;
};

/**
 * The last step of the path: the verdict, in its three faces.
 *
 * `Review` is a face of its own — day 28 has passed and the curator is writing —
 * because "nothing here yet" and "it is being written" are different answers to
 * the only question the author has at that point.
 */
export function CheckpointStepPanel({ checkpoint }: CheckpointStepPanelProps) {
	const { t } = useTranslate();

	const outcomes = checkpoint.items.filter(
		(item) => item.kind === CheckpointItemKind.Outcome,
	);
	const proven = outcomes.filter((item) => item.artifact).length;

	if (!checkpoint.verdict) {
		return checkpoint.status === CheckpointStatus.Review ? (
			<EmptyState
				icon={IconHourglass}
				tint="var(--gd-warning-tint)"
				ink="var(--gd-warning-solid)"
				title={t("checkpoints.verdict.review", "The curator is writing it")}
				description={t(
					"checkpoints.verdict.reviewNote",
					"Waiting for the curator’s verdict.",
				)}
			/>
		) : (
			<EmptyState
				icon={IconLock}
				title={t("checkpoints.verdict.locked", "Written on day 28")}
				description={t(
					"checkpoints.verdict.lockedNote",
					"{done} of {total} outcomes has evidence against it so far.",
					{ done: proven, total: outcomes.length },
				)}
			/>
		);
	}

	return (
		<Flex vertical gap={16}>
			<Card
				size="small"
				styles={{ body: { padding: 0 } }}
				title={
					<span className={styles.title}>
						{t("checkpoints.verdict.title", "The verdict")}
					</span>
				}
				extra={
					<Flex gap={12} align="center">
						{!!checkpoint.decidedAt && (
							<Typography.Text type="secondary" className={styles.meta}>
								{dayjs(checkpoint.decidedAt).format("D MMM")}
							</Typography.Text>
						)}
						<VerdictChip verdict={checkpoint.verdict} />
					</Flex>
				}
			>
				{!!checkpoint.verdictNote && (
					<div className={styles.prose}>{checkpoint.verdictNote}</div>
				)}
			</Card>

			<Card
				size="small"
				styles={{ body: { padding: 0 } }}
				title={
					<span className={styles.title}>
						{t("checkpoints.result.title", "The result card")}
					</span>
				}
			>
				<div className={styles.table}>
					<Flex gap={16} className={styles.columns}>
						<span className={styles.colWide}>
							{t("checkpoints.result.column.planned", "PLANNED ON DAY 1")}
						</span>
						<span className={styles.col}>
							{t("checkpoints.result.column.changed", "WHAT CHANGED")}
						</span>
						<span className={styles.col}>
							{t("checkpoints.result.column.came", "WHAT CAME OF IT")}
						</span>
					</Flex>

					{outcomes.map((item) => (
						<Flex key={item.id} gap={16} className={styles.row}>
							<Typography.Text
								className={styles.colWide}
								delete={item.cut}
								type={item.cut ? "secondary" : undefined}
							>
								{item.originalText ?? item.text}
							</Typography.Text>

							<Typography.Text className={styles.col}>
								{item.cut
									? t("checkpoints.result.cut", "Cut on day 14")
									: item.originalText
										? t("checkpoints.result.reworded", "Reworded — {text}", {
												text: item.text,
											})
										: item.addedAt
											? t("checkpoints.result.added", "Added on day 14")
											: "—"}
							</Typography.Text>

							<Typography.Text className={styles.col} type="secondary">
								{item.artifact
									? (item.artifact.name ?? item.artifact.link)
									: item.acceptedNote
										? t(
												"checkpoints.evidence.accepted",
												"Counted by the curator",
											)
										: t(
												"checkpoints.evidence.notDelivered",
												"Nothing was attached",
											)}
							</Typography.Text>
						</Flex>
					))}
				</div>
			</Card>
		</Flex>
	);
}
