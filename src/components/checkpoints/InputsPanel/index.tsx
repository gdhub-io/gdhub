"use client";

import { useTranslate } from "@tolgee/react";
import { Card, Flex, Typography } from "antd";
import dayjs from "dayjs";
import { CheckpointItemKind } from "@/config/prisma-enums";
import type { CheckpointDto, CheckpointItemDto } from "@/types/checkpoints";
import { EvidenceSlot } from "../EvidenceSlot";
import { MoneyNotice } from "../MoneyNotice";
import styles from "./style.module.scss";

export type InputsPanelProps = {
	checkpoint: CheckpointDto;
};

/**
 * The first step once it is bought: what the project had, and what it owes —
 * frames `Checkpoint — Page · Inputs, and the Checkpoint step`.
 *
 * The same step is the purchase before it is paid for; from here it is the
 * record: what there was, the goal with the list that spells it out, and —
 * last, as a line — that it was paid for.
 */
export function InputsPanel({ checkpoint }: InputsPanelProps) {
	const { t } = useTranslate();

	const side = (kind: CheckpointItemKind) =>
		checkpoint.items.filter((item) => item.kind === kind);

	const card = (
		title: string,
		meta: string,
		items: CheckpointItemDto[],
		empty: string,
		// The goal, and under it the list that spells it out — numbered, so the
		// two read as one sentence and its parts.
		goal?: string,
	) => (
		<Card
			size="small"
			styles={{ body: { padding: 0 } }}
			title={<span className={styles.title}>{title}</span>}
			extra={
				<Typography.Text type="secondary" className={styles.meta}>
					{meta}
				</Typography.Text>
			}
		>
			{!!goal && (
				<Typography.Paragraph className={styles.goal}>
					{goal}
				</Typography.Paragraph>
			)}
			{items.length ? (
				<div className={styles.rows}>
					{items.map((item, index) => (
						<Flex key={item.id} gap={12} align="center" className={styles.row}>
							{!!goal && (
								<Typography.Text type="secondary" className={styles.number}>
									{index + 1}.
								</Typography.Text>
							)}
							<Typography.Text
								className={styles.text}
								delete={item.cut}
								type={item.cut ? "secondary" : undefined}
							>
								{item.text}
							</Typography.Text>
							<EvidenceSlot artifact={item.artifact} />
						</Flex>
					))}
				</div>
			) : (
				<Typography.Text type="secondary" className={styles.empty}>
					{empty}
				</Typography.Text>
			)}
		</Card>
	);

	const outcomes = side(CheckpointItemKind.Outcome);
	const claimed = outcomes.filter((item) => item.artifact).length;

	return (
		<Flex vertical gap={16}>
			{card(
				t("checkpoints.inputs.existed", "What existed on day 1"),
				checkpoint.startedAt
					? dayjs(checkpoint.startedAt).format("D MMM YYYY")
					: t("checkpoints.inputs.notStarted", "not started yet"),
				side(CheckpointItemKind.Input),
				t("checkpoints.goal.sideEmpty", "Nothing listed"),
			)}

			{card(
				t("checkpoints.goal.label", "Goal"),
				t("checkpoints.goal.claimed", "{claimed} of {owed} outcomes claimed", {
					claimed,
					owed: outcomes.filter((item) => !item.cut).length,
				}),
				outcomes,
				t("checkpoints.goal.sideEmpty", "Nothing listed"),
				checkpoint.goal,
			)}

			{!!checkpoint.goalAgreedAt && (
				<Typography.Text type="secondary" className={styles.note}>
					{t(
						"checkpoints.inputs.agreed",
						"Agreed with the curator on {date}. From then it is what the verdict is written against.",
						{ date: dayjs(checkpoint.goalAgreedAt).format("D MMM") },
					)}
				</Typography.Text>
			)}

			<MoneyNotice checkpoint={checkpoint} inset />
		</Flex>
	);
}
