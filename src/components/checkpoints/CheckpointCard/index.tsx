"use client";

import { useTranslate } from "@tolgee/react";
import { Button, Flex, Typography } from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import { CheckpointStatus } from "@/config/prisma-enums";
import { CHECKPOINT_DAYS } from "@/schemas/checkpoint";
import type { CheckpointDto } from "@/types/checkpoints";
import { CheckpointSignals } from "../CheckpointSignals";
import { CheckpointStatusSlot } from "../CheckpointStatusSlot";
import { CuratorBadge } from "../CuratorBadge";
import styles from "./style.module.scss";

export type CheckpointCardProps = {
	checkpoint: CheckpointDto;
	projectSlug: string;
};

/**
 * The checkpoint under way — frame `qfMkz`.
 *
 * Three bands with a hairline between them: what this checkpoint is, where it
 * has got to, and the one thing to do about it. A draft is `DraftCard` instead:
 * it has no goal to quote and no day to count, so the same shape would be a card
 * of empty fields.
 */
export function CheckpointCard({
	checkpoint,
	projectSlug,
}: CheckpointCardProps) {
	const { t } = useTranslate();

	const dates =
		checkpoint.startedAt && checkpoint.dueAt
			? `${dayjs(checkpoint.startedAt).format("D MMM")}–${dayjs(checkpoint.dueAt).format("D MMM YYYY")}`
			: null;

	const href = `/user/project/${projectSlug}/checkpoints/${checkpoint.id}`;

	// Nothing has run yet, so the signals would all read zero and the day
	// counter would count from a date nobody has agreed to: the card says what
	// it is and waits with the author.
	const waiting = checkpoint.status === CheckpointStatus.AwaitingCurator;

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

				{waiting && (
					<Typography.Text type="secondary" className={styles.counter}>
						{t(
							"checkpoints.card.awaiting",
							"Paid. The 28 days start when the curator takes it on.",
						)}
					</Typography.Text>
				)}

				{!waiting && checkpoint.daysLeft !== null && (
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

				{!waiting && !!checkpoint.signals && (
					<CheckpointSignals
						signals={checkpoint.signals}
						day={checkpoint.day}
					/>
				)}
			</div>

			<footer className={styles.foot}>
				<Link href={href}>
					<Button type="primary">
						{t("checkpoints.open", "Open checkpoint")}
					</Button>
				</Link>
			</footer>
		</section>
	);
}
