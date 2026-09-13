"use client";

import { useTranslate } from "@tolgee/react";
import { Flex, Typography } from "antd";
import { SectionHeading } from "@/components/ui";
import { CheckpointItemKind } from "@/config/prisma-enums";
import type { CheckpointItemDto } from "@/types/checkpoints";
import { EvidenceSlot } from "../EvidenceSlot";
import styles from "./style.module.scss";

export type GoalCardProps = {
	items: CheckpointItemDto[];
};

/**
 * The goal card as the record: what the project had, what it owes, and what
 * proves each line. Read-only — once the 28 days are running the card is what
 * the verdict is measured against, and the only way it moves is the day-14
 * scope change.
 *
 * A line cut on day 14 keeps its text, is struck through, and is never counted
 * as missing evidence.
 */
export function GoalCard({ items }: GoalCardProps) {
	const { t } = useTranslate();

	const side = (kind: CheckpointItemKind, title: string) => {
		const lines = items.filter((item) => item.kind === kind);

		return (
			<Flex vertical gap={12} className={styles.side}>
				<SectionHeading level={4} title={title} />

				{lines.length === 0 && (
					<Typography.Text type="secondary">
						{t("checkpoints.goal.sideEmpty", "Nothing listed")}
					</Typography.Text>
				)}

				{lines.map((item) => (
					<Flex key={item.id} gap={8} align="center" className={styles.row}>
						<Typography.Text
							className={styles.text}
							delete={item.cut}
							type={item.cut ? "secondary" : undefined}
						>
							{item.text}
						</Typography.Text>
						{!item.cut && (
							<EvidenceSlot
								artifact={item.artifact}
								emptyLabel={
									kind === CheckpointItemKind.Outcome
										? t("checkpoints.evidence.none", "Nothing attached")
										: undefined
								}
							/>
						)}
					</Flex>
				))}
			</Flex>
		);
	};

	return (
		<Flex gap={32} wrap className={styles.card}>
			{side(
				CheckpointItemKind.Input,
				t("checkpoints.goal.inputs", "What the project had"),
			)}
			{side(
				CheckpointItemKind.Outcome,
				t("checkpoints.goal.outcomes", "What it owes by day 28"),
			)}
		</Flex>
	);
}
