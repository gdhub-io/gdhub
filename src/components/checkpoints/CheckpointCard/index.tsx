"use client";

import { useTranslate } from "@tolgee/react";
import { Button, Flex, Typography } from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import { CheckpointStatus } from "@/config/prisma-enums";
import { CHECKPOINT_DAYS } from "@/schemas/checkpoint";
import type { CheckpointDto } from "@/types/checkpoints";
import { CheckpointStatusSlot } from "../CheckpointStatusSlot";
import { CuratorBadge } from "../CuratorBadge";
import styles from "./style.module.scss";

export type CheckpointCardProps = {
	checkpoint: CheckpointDto;
	projectSlug: string;
	onDiscard?: (id: string) => void;
	discarding?: boolean;
};

/**
 * The one live item in the list, and the only one that takes a fill —
 * everything below it stays outlined (frame `iSVBs`).
 *
 * Three bands with a hairline between them: what this checkpoint is, where it
 * has got to, and the one thing to do about it. A draft and a checkpoint under
 * way are the same card with a different foot: they are one object at two
 * moments, and two shapes would teach the reader that they are two things.
 */
export function CheckpointCard({
	checkpoint,
	projectSlug,
	onDiscard,
	discarding,
}: CheckpointCardProps) {
	const { t } = useTranslate();
	const isDraft = checkpoint.status === CheckpointStatus.Draft;

	const dates =
		checkpoint.startedAt && checkpoint.dueAt
			? `${dayjs(checkpoint.startedAt).format("D MMM")}–${dayjs(checkpoint.dueAt).format("D MMM YYYY")}`
			: null;

	// Draft or running, it is the same page — a draft simply opens on the step
	// where it is still being bought.
	const href = `/user/project/${projectSlug}/checkpoints/${checkpoint.id}`;

	return (
		<section className={styles.card}>
			<header className={styles.head}>
				<Flex gap={12} align="center" className={styles.identity}>
					{/* The number names it, the stage is context: numbering runs
					    through the project rather than restarting inside a stage. */}
					<Typography.Text className={styles.stage}>
						{t("checkpoints.number", "Checkpoint {number}", {
							number: checkpoint.order,
						})}
					</Typography.Text>
					<Typography.Text className={styles.number} ellipsis>
						{[checkpoint.stageName, dates]
							.filter(Boolean)
							.map((part) => `· ${part}`)
							.join(" ")}
					</Typography.Text>
					<CheckpointStatusSlot checkpoint={checkpoint} />
				</Flex>
				<CuratorBadge
					kind={checkpoint.curatorKind}
					curator={checkpoint.curator}
				/>
			</header>

			<div className={styles.body}>
				<Typography.Paragraph className={styles.goal} ellipsis={{ rows: 3 }}>
					{checkpoint.goal ||
						t("checkpoints.goal.empty", "The goal is not written yet")}
				</Typography.Paragraph>

				{checkpoint.daysLeft !== null && (
					<Flex vertical gap={8}>
						<Typography.Text className={styles.counter}>
							{t("checkpoints.status.daysLeft", "{count} days left", {
								count: checkpoint.daysLeft,
							})}
						</Typography.Text>
						<div className={styles.track}>
							<div
								className={styles.fill}
								style={{
									width: `${((checkpoint.day ?? 1) / CHECKPOINT_DAYS) * 100}%`,
								}}
							/>
						</div>
					</Flex>
				)}
			</div>

			<footer className={styles.foot}>
				<Typography.Text className={styles.note}>
					{isDraft
						? t(
								"checkpoints.draft.nothingCharged",
								"Nothing has been charged and no days are counting.",
							)
						: ""}
				</Typography.Text>

				<Flex gap={8}>
					{isDraft && onDiscard && (
						<Button
							loading={discarding}
							onClick={() => onDiscard(checkpoint.id)}
						>
							{t("checkpoints.draft.discard", "Discard")}
						</Button>
					)}
					<Link href={href}>
						<Button type="primary">
							{isDraft
								? t("checkpoints.continue", "Continue")
								: t("checkpoints.open", "Open checkpoint")}
						</Button>
					</Link>
				</Flex>
			</footer>
		</section>
	);
}
