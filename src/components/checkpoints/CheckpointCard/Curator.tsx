"use client";

import { IconMessageCircle, IconVideo } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Divider, Flex, Tooltip, Typography } from "antd";
import Link from "next/link";
import { useAccess } from "@/components/access/AccessProvider";
import { useChat } from "@/components/Chat/useChat";
import { AppAvatar } from "@/components/ui/AppAvatar";
import { AI_CURATOR_AVATAR } from "@/config/checkpoint";
import { CheckpointCuratorKind } from "@/config/prisma-enums";
import { opensRoom } from "@/lib/checkpoint-room";
import type { CheckpointDto } from "@/types/checkpoints";
import styles from "./style.module.scss";

/** Who curates the checkpoint and the two ways to reach them — the card's right side, and the page header's. */
export function CheckpointCurator({
	checkpoint,
	projectSlug,
}: {
	checkpoint: Pick<CheckpointDto, "id" | "status" | "curatorKind" | "curator">;
	/** The project the checkpoint is opened in; the call button leads to its room tab. */
	projectSlug?: string;
}) {
	const { t } = useTranslate();
	const { can } = useAccess();
	// No room, no button: an AI curator, a checkpoint not running, or the
	// curator's own pages outside the project space.
	const roomOpen =
		!!projectSlug && can("project.room.use") && opensRoom(checkpoint);
	const { setOpenChatModal } = useChat();

	const isAI = checkpoint.curatorKind === CheckpointCuratorKind.AI;
	const { curator } = checkpoint;
	const speciality = curator?.speciality;

	return (
		<Flex gap={12} align="center">
			<Flex gap={12} align="center">
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
					<AppAvatar size={40} src={AI_CURATOR_AVATAR} />
				) : (
					<AppAvatar size={40} src={curator?.image ?? undefined}>
						{curator?.name?.[0]}
					</AppAvatar>
				)}
			</Flex>
			<Divider orientation="vertical" className={styles.divider} />
			{roomOpen && (
				<Tooltip title={t("checkpoints.card.room", "Open the room")}>
					<Link
						href={`/user/project/${projectSlug}/checkpoints/${checkpoint.id}?tab=room`}
					>
						<Button
							icon={<IconVideo size={16} />}
							aria-label={t("checkpoints.card.room", "Open the room")}
						/>
					</Link>
				</Tooltip>
			)}
			<Tooltip title={t("checkpoints.card.chat", "Chat with curator")}>
				<Button
					icon={<IconMessageCircle size={16} />}
					aria-label={t("checkpoints.card.chat", "Chat with curator")}
					onClick={() => setOpenChatModal(true)}
				/>
			</Tooltip>
		</Flex>
	);
}
