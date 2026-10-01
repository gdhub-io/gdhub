"use client";

import {
	IconMessageCircle,
	IconSparkles,
	IconVideo,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Divider, Flex, Tooltip, Typography } from "antd";
import { useChat } from "@/components/Chat/useChat";
import { AppAvatar } from "@/components/ui/AppAvatar";
import { CheckpointCuratorKind } from "@/config/prisma-enums";
import type { CheckpointDto } from "@/types/checkpoints";
import styles from "./style.module.scss";

/** Who curates the checkpoint and the two ways to reach them — the card's right side, and the page header's. */
export function CheckpointCurator({
	checkpoint,
}: {
	checkpoint: Pick<CheckpointDto, "curatorKind" | "curator">;
}) {
	const { t } = useTranslate();
	const { setOpenChatModal } = useChat();

	const isAI = checkpoint.curatorKind === CheckpointCuratorKind.AI;
	const { curator } = checkpoint;
	const speciality = curator?.speciality;

	return (
		<Flex gap={12} align="center">
			<Flex gap={10} align="center">
				<Flex vertical align="flex-end" className={styles.curatorText}>
					<Typography.Text strong ellipsis>
						{isAI
							? t("checkpoints.curator.ai", "AI curator")
							: (curator?.name ??
								t("checkpoints.curator.unassigned", "Curator to be assigned"))}
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
					<AppAvatar size={36} icon={<IconSparkles size={18} stroke={1.6} />} />
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
	);
}
