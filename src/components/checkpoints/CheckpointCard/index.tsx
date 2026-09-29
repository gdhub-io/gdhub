"use client";

import {
	IconFlag,
	IconMessageCircle,
	IconSparkles,
	IconVideo,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Divider, Flex, Tag, Tooltip, Typography } from "antd";
import Link from "next/link";
import { useChat } from "@/components/Chat/useChat";
import { AppAvatar } from "@/components/ui/AppAvatar";
import {
	CheckpointCuratorKind,
	CheckpointItemKind,
	CheckpointStatus,
} from "@/config/prisma-enums";
import type { CheckpointDto } from "@/types/checkpoints";
import { CheckpointStatusSlot } from "../CheckpointStatusSlot";
import { dayRange, SprintTrack } from "./SprintTrack";
import styles from "./style.module.scss";
import { TaskSquares } from "./TaskSquares";

export type CheckpointCardProps = {
	checkpoint: CheckpointDto;
	projectSlug: string;
	/** Where the title leads. Defaults to the author's page inside the project. */
	href?: string;
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
}: CheckpointCardProps) {
	const { t } = useTranslate();
	const { setOpenChatModal } = useChat();

	const isAI = checkpoint.curatorKind === CheckpointCuratorKind.AI;
	const { curator } = checkpoint;
	const speciality = curator?.speciality;

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
						<Link
							href={
								href ??
								`/user/project/${projectSlug}/checkpoints/${checkpoint.id}`
							}
							className={styles.title}
						>
							{t("checkpoints.number", "Checkpoint {number}", {
								number: checkpoint.order,
							})}
						</Link>
						<Tag variant="filled">{checkpoint.stageName}</Tag>
						{!running && <CheckpointStatusSlot checkpoint={checkpoint} />}
					</Flex>
					<Typography.Text className={styles.muted}>
						{[dates, dayLine].filter(Boolean).join(" · ")}
					</Typography.Text>
				</Flex>

				<Flex gap={12} align="center">
					<Flex gap={10} align="center">
						<Flex vertical align="flex-end" className={styles.curatorText}>
							<Typography.Text strong ellipsis>
								{isAI
									? t("checkpoints.curator.ai", "AI curator")
									: (curator?.name ??
										t(
											"checkpoints.curator.unassigned",
											"Curator to be assigned",
										))}
							</Typography.Text>
							<Typography.Text className={styles.muted} ellipsis>
								{[
									t("checkpoints.card.curator", "Curator"),
									speciality?.name,
									speciality && t(speciality.level),
								]
									.filter(Boolean)
									.join(" · ")}
							</Typography.Text>
						</Flex>
						{isAI ? (
							<AppAvatar
								size={36}
								icon={<IconSparkles size={18} stroke={1.6} />}
							/>
						) : (
							<AppAvatar size={36} src={curator?.image ?? undefined}>
								{curator?.name?.[0]}
							</AppAvatar>
						)}
					</Flex>
					<Divider orientation="vertical" className={styles.divider} />
					{/* No checkpoint room yet: chat opens the messenger itself, the call page is still to come. */}
					<Tooltip title={t("checkpoints.card.soon", "Coming soon")}>
						<Button
							disabled
							icon={<IconVideo size={18} stroke={1.6} />}
							aria-label={t("checkpoints.card.call", "Call curator")}
						/>
					</Tooltip>
					<Tooltip title={t("checkpoints.card.chat", "Chat with curator")}>
						<Button
							icon={<IconMessageCircle size={18} stroke={1.6} />}
							aria-label={t("checkpoints.card.chat", "Chat with curator")}
							onClick={() => setOpenChatModal(true)}
						/>
					</Tooltip>
				</Flex>
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
		</section>
	);
}
