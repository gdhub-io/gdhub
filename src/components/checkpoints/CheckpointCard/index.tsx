"use client";

import { IconArrowRight, IconFlag } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Flex, Tag, Typography } from "antd";
import Link from "next/link";
import type { ReactNode } from "react";
import { CheckpointItemKind, CheckpointStatus } from "@/config/prisma-enums";
import type { CheckpointDto } from "@/types/checkpoints";
import { CheckpointStatusSlot } from "../CheckpointStatusSlot";
import { CheckpointCurator } from "./Curator";
import { dayRange, SprintTrack } from "./SprintTrack";
import styles from "./style.module.scss";
import { TaskSquares } from "./TaskSquares";

export type CheckpointCardProps = {
	checkpoint: CheckpointDto;
	projectSlug: string;
	/** Where the button leads. Defaults to the author's page inside the project. */
	href?: string;
	/** Placed before the button: what the viewer owes this checkpoint, if anything. */
	action?: ReactNode;
};

/**
 * The checkpoint under way — frame `TJ2dF`: what it is and who curates it, the
 * four sprints, the goal, and the outcomes as squares. A draft is `DraftCard`
 * instead: it has no goal to quote and no day to count.
 */
export function CheckpointCard({
	checkpoint,
	projectSlug,
	href,
	action,
}: CheckpointCardProps) {
	const { t } = useTranslate();

	const dates =
		checkpoint.startedAt && checkpoint.dueAt
			? dayRange(checkpoint.startedAt, checkpoint.dueAt, "D MMM YYYY")
			: null;
	// While the 28 days run the day belongs to the dates; after that the slot
	// beside the title says what is being waited for.
	const running = checkpoint.status === CheckpointStatus.Active;
	const dayLine = running
		? t("checkpoints.status.day", "Day {day} of 28", {
				day: checkpoint.day ?? 1,
			})
		: null;

	const outcomes = checkpoint.items.filter(
		(item) => item.kind === CheckpointItemKind.Outcome,
	);

	return (
		// ui-guard-ignore the card keeps its own section: antd Card adds a body padding the frame does not have
		<section className={styles.card}>
			<Flex justify="space-between" align="center" gap={24} wrap>
				<Flex vertical gap={6} className={styles.identity}>
					<Flex gap={10} align="center" wrap>
						<Typography.Text className={styles.title}>
							{t("checkpoints.number", "Checkpoint {number}", {
								number: checkpoint.order,
							})}
						</Typography.Text>
						<Tag variant="filled">{checkpoint.stageName}</Tag>
						{!running && <CheckpointStatusSlot checkpoint={checkpoint} />}
					</Flex>
					<Typography.Text className={styles.muted}>
						{[dates, dayLine].filter(Boolean).join(" · ")}
					</Typography.Text>
				</Flex>

				<CheckpointCurator checkpoint={checkpoint} projectSlug={projectSlug} />
			</Flex>

			{!!checkpoint.sprints?.length && (
				<SprintTrack sprints={checkpoint.sprints} day={checkpoint.day} />
			)}

			<Flex vertical gap={6} className={styles.goal}>
				<Flex gap={6} align="center" className={styles.goalLabel}>
					<IconFlag size={14} stroke={1.6} />
					{t("checkpoints.card.goal", "Checkpoint goal")}
				</Flex>
				<Typography.Paragraph
					className={styles.goalText}
					ellipsis={{ rows: 3 }}
				>
					{checkpoint.goal ||
						t("checkpoints.goal.empty", "The goal is not written yet")}
				</Typography.Paragraph>
			</Flex>

			{outcomes.length > 0 && <TaskSquares items={outcomes} />}

			<Flex justify="flex-end" align="center" gap={12} wrap>
				{action}
				<Link
					href={
						href ?? `/user/project/${projectSlug}/checkpoints/${checkpoint.id}`
					}
				>
					<Button
						icon={<IconArrowRight size={18} stroke={1.6} />}
						iconPlacement="end"
					>
						{t("checkpoints.open", "Open checkpoint")}
					</Button>
				</Link>
			</Flex>
		</section>
	);
}
