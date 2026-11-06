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
import { checkpointPathHref } from "@/lib/checkpoints/hrefs";
import { opensRoom } from "@/lib/checkpoints/room";
import type { CallRole } from "@/types/checkpoint-call";
import type { CheckpointDto } from "@/types/checkpoints";
import styles from "./style.module.scss";

/** Who curates the checkpoint and the two ways to reach them — the card's right side. */
export function CheckpointCurator({
	checkpoint,
	projectSlug,
	viewer = "team",
}: {
	checkpoint: Pick<
		CheckpointDto,
		"id" | "order" | "status" | "curatorKind" | "curator"
	>;
	/** The project the checkpoint is opened in; the call button leads to its Path to Checkpoint. */
	projectSlug: string;
	viewer?: CallRole;
}) {
	const { t } = useTranslate();
	const { can } = useAccess();
	// No room, no button: an AI curator, a checkpoint not running, or a viewer
	// outside the project space.
	const roomOpen = can("project.room.use") && opensRoom(checkpoint);
	const { setOpenChatModal } = useChat();

	const isAI = checkpoint.curatorKind === CheckpointCuratorKind.AI;
	const { curator } = checkpoint;
	const speciality = curator?.speciality;
	const chatLabel =
		viewer === "curator"
			? t("checkpoints.card.chatTeam", "Chat with team")
			: t("checkpoints.card.chat", "Chat with curator");

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
					<Link href={checkpointPathHref(projectSlug, checkpoint.order)}>
						<Button
							icon={<IconVideo size={16} />}
							aria-label={t("checkpoints.card.room", "Open the room")}
						/>
					</Link>
				</Tooltip>
			)}
			<Tooltip title={chatLabel}>
				<Button
					icon={<IconMessageCircle size={16} />}
					aria-label={chatLabel}
					onClick={() => setOpenChatModal(true)}
				/>
			</Tooltip>
		</Flex>
	);
}
