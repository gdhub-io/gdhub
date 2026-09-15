"use client";

import { useTranslate } from "@tolgee/react";
import { Flex, Typography } from "antd";
import dayjs from "dayjs";
import {
	CheckpointCuratorKind,
	CheckpointItemKind,
} from "@/config/prisma-enums";
import type { CheckpointDto, CheckpointItemDto } from "@/types/checkpoints";
import { AskPanel } from "../AskPanel";
import { EvidenceSlot } from "../EvidenceSlot";
import styles from "./style.module.scss";

export type InputsPanelProps = {
	checkpoint: CheckpointDto;
};

/**
 * The first step once it is bought: what the project had, and what it owes —
 * frames `Checkpoint — Page · Inputs, and the Checkpoint step`.
 *
 * The same step is the purchase before it is paid for; from here it is the
 * record. The goal itself is not repeated: it sits on every sprint's Status,
 * and here the list is already the subject.
 */
export function InputsPanel({ checkpoint }: InputsPanelProps) {
	const { t } = useTranslate();

	const side = (kind: CheckpointItemKind) =>
		checkpoint.items.filter((item) => item.kind === kind);

	const waitingOnCurator =
		checkpoint.curatorKind === CheckpointCuratorKind.Human &&
		!checkpoint.startedAt;

	const card = (
		title: string,
		meta: string,
		items: CheckpointItemDto[],
		empty: string,
	) => (
		<div className={styles.card}>
			<Flex
				align="center"
				justify="space-between"
				gap={12}
				className={styles.head}
			>
				<Typography.Text className={styles.title}>{title}</Typography.Text>
				<Typography.Text type="secondary" className={styles.meta}>
					{meta}
				</Typography.Text>
			</Flex>

			{items.length ? (
				<div className={styles.rows}>
					{items.map((item) => (
						<Flex key={item.id} gap={12} align="center" className={styles.row}>
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
		</div>
	);

	const outcomes = side(CheckpointItemKind.Outcome);
	const claimed = outcomes.filter((item) => item.artifact).length;

	return (
		<Flex vertical gap={16}>
			{waitingOnCurator && (
				<AskPanel
					title={t(
						"checkpoints.asks.titleCheckpoint",
						"What this checkpoint asks of you",
					)}
					count={t("checkpoints.asks.open", "{count} open", { count: 1 })}
					rows={[
						{
							key: "curator",
							glyph: "todo",
							title: t(
								"checkpoints.waiting.title",
								"{name} has not taken these 28 days yet",
								{
									name:
										checkpoint.curator?.name ??
										t("checkpoints.waiting.curator", "The curator"),
								},
							),
							owner: t("checkpoints.asks.owner.curator", "Curator"),
							meta: t(
								"checkpoints.waiting.body",
								"Your curator confirms the start date. You’ll be notified when they respond.",
							),
						},
					]}
				/>
			)}

			{card(
				t("checkpoints.inputs.existed", "What existed on day 1"),
				checkpoint.startedAt
					? dayjs(checkpoint.startedAt).format("D MMM YYYY")
					: t("checkpoints.inputs.notStarted", "not started yet"),
				side(CheckpointItemKind.Input),
				t("checkpoints.goal.sideEmpty", "Nothing listed"),
			)}

			{card(
				t("checkpoints.outcomes.title", "Outcomes"),
				t("checkpoints.goal.claimed", "{claimed} of {owed} outcomes claimed", {
					claimed,
					owed: outcomes.filter((item) => !item.cut).length,
				}),
				outcomes,
				t("checkpoints.goal.sideEmpty", "Nothing listed"),
			)}

			<Typography.Text type="secondary" className={styles.note}>
				{checkpoint.goalAgreedAt
					? t(
							"checkpoints.inputs.agreed",
							"Agreed with the curator on {date}. From then it is what the verdict is written against.",
							{ date: dayjs(checkpoint.goalAgreedAt).format("D MMM") },
						)
					: t(
							"checkpoints.outcomes.draftNote",
							"Editable until the goal call, then locked for the cycle.",
						)}
			</Typography.Text>
		</Flex>
	);
}
