"use client";

import { CheckpointStatus } from "@gdhub-io/gdhub-prisma";
import { IconArrowRight, IconTrash } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Flex, Progress, Typography } from "antd";
import dayjs from "dayjs";
import Link from "next/link";
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
 * The one live item in the list, and the only one that takes a fill — everything
 * below it stays outlined. A draft and a running checkpoint are the same card
 * with a different call to action, because they are the same object at two
 * moments and splitting them would teach the reader two shapes for one thing.
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
			? `${dayjs(checkpoint.startedAt).format("D MMM")} – ${dayjs(checkpoint.dueAt).format("D MMM YYYY")}`
			: null;

	return (
		<div className={styles.card}>
			<Flex justify="space-between" align="flex-start" gap={16} wrap>
				<div className={styles.identity}>
					<Typography.Text className={styles.meta}>
						{[
							checkpoint.stageName,
							t("checkpoints.number", "Checkpoint {number}", {
								number: checkpoint.order,
							}),
							dates,
						]
							.filter(Boolean)
							.join(" · ")}
					</Typography.Text>
					<Typography.Paragraph className={styles.goal} ellipsis={{ rows: 3 }}>
						{checkpoint.goal ||
							t("checkpoints.goal.empty", "The goal is not written yet")}
					</Typography.Paragraph>
				</div>

				<Flex vertical align="flex-end" gap={8}>
					<CheckpointStatusSlot checkpoint={checkpoint} />
					<CuratorBadge
						kind={checkpoint.curatorKind}
						curator={checkpoint.curator}
					/>
				</Flex>
			</Flex>

			{!isDraft && checkpoint.day !== null && (
				<Progress
					percent={(checkpoint.day / CHECKPOINT_DAYS) * 100}
					showInfo={false}
					size="small"
					className={styles.track}
				/>
			)}

			<Flex justify="space-between" align="center" gap={12} wrap>
				{isDraft ? (
					<Typography.Text type="secondary" className={styles.note}>
						{t(
							"checkpoints.draft.nothingCharged",
							"Nothing has been charged and no days are counting.",
						)}
					</Typography.Text>
				) : (
					<span />
				)}

				<Flex gap={8}>
					{isDraft && onDiscard && (
						<Button
							icon={<IconTrash size={16} />}
							loading={discarding}
							onClick={() => onDiscard(checkpoint.id)}
						>
							{t("checkpoints.draft.discard", "Discard")}
						</Button>
					)}
					<Link
						href={`/user/project/${projectSlug}/checkpoints/${checkpoint.id}`}
					>
						<Button type="primary" icon={<IconArrowRight size={16} />}>
							{isDraft
								? t("checkpoints.continue", "Continue")
								: t("checkpoints.open", "Open")}
						</Button>
					</Link>
				</Flex>
			</Flex>
		</div>
	);
}
