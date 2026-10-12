"use client";

import { IconMessageCircle, IconPaperclip } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { App, Button, Tag, Tooltip, Typography } from "antd";
import { useState } from "react";
import { useChat } from "@/components/Chat/useChat";
import { AttachEvidenceModal } from "@/components/checkpoints/AttachEvidenceModal";
import { AppAvatar } from "@/components/ui/AppAvatar";
import WorkflowTaskCard from "@/components/WorkflowContent/WorkflowTaskCard";
import {
	CheckpointCuratorKind,
	CheckpointItemKind,
} from "@/config/prisma-enums";
import { useCheckpointChat } from "@/hooks/checkpoints";
import type { CheckpointArtifactRef, CheckpointDto } from "@/types/checkpoints";
import { ArtifactLink } from "./ArtifactLink";
import { formatDayRange } from "./dates";
import styles from "./style.module.scss";

const { Text } = Typography;

export type CheckpointAsideProps = {
	checkpoint: CheckpointDto;
	canManage: boolean;
};

/**
 * Frame 08 (`RV1gV`): the running checkpoint at a glance beside the path — its
 * goal, its tasks with what proves them, and the curator one click from a chat.
 */
export function CheckpointAside({
	checkpoint,
	canManage,
}: CheckpointAsideProps) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const [attaching, setAttaching] = useState(false);
	const openChat = useCheckpointChat(checkpoint.id);

	const outcomes = checkpoint.items.filter(
		(item) => item.kind === CheckpointItemKind.Outcome && !item.cut,
	);
	// An outcome is proven by its own artifact or by evidence offered against it.
	const proofOf = (id: string): CheckpointArtifactRef | null =>
		checkpoint.items.find((item) => item.id === id)?.artifact ??
		checkpoint.evidence?.find((row) => row.itemIds.includes(id))?.artifact ??
		null;
	const done = outcomes.filter((item) => proofOf(item.id)).length;
	const curator = checkpoint.curator;
	const isAI = checkpoint.curatorKind === CheckpointCuratorKind.AI;

	const chat = () =>
		openChat.mutate(undefined, {
			onSuccess: ({ roomId }) => {
				const { setSelectedRoomId, setOpenChatModal } = useChat.getState();
				setSelectedRoomId(roomId);
				setOpenChatModal(true);
			},
			onError: () =>
				message.error(
					t("workflow.aside.chatFailed", "The chat could not open"),
				),
		});

	return (
		<section className={styles.asideCard}>
			<div className={styles.asideHead}>
				<div className={styles.asideRow}>
					<Text strong className={styles.asideTitle}>
						{t("workflow.aside.checkpoint", "Checkpoint {number}", {
							number: String(checkpoint.number ?? 1),
						})}
					</Text>
					{isAI && <Tag variant="filled">{t("workflow.aside.ai", "AI")}</Tag>}
				</div>
				{checkpoint.startedAt && checkpoint.dueAt && (
					<Text type="secondary" className={styles.asideMeta}>
						{formatDayRange(checkpoint.startedAt, checkpoint.dueAt)}
					</Text>
				)}
			</div>

			<div className={styles.asideBody}>
				<div className={styles.asideBlock}>
					<Text type="secondary" strong className={styles.asideMeta}>
						{t("workflow.aside.goal", "Goal")}
					</Text>
					<Text>{checkpoint.goal}</Text>
				</div>

				<div className={styles.asideBlock}>
					{outcomes.length > 0 && (
						<>
							<div className={styles.asideRow}>
								<Text type="secondary" strong className={styles.asideMeta}>
									{t("workflow.aside.tasks", "Tasks")}
								</Text>
								<Text type="secondary" className={styles.asideMeta}>
									{t("workflow.path.count", "{done} of {total}", {
										done: String(done),
										total: String(outcomes.length),
									})}
								</Text>
							</div>
							<div className={styles.asideTasks}>
								{outcomes.map((item) => {
									const proof = proofOf(item.id);
									return (
										<WorkflowTaskCard
											key={item.id}
											label={item.text}
											completed={!!proof}
											action={
												proof ? (
													<ArtifactLink artifact={proof} compact />
												) : (
													canManage && (
														<Tooltip
															title={t(
																"workflow.aside.attach",
																"Attach an artifact",
															)}
														>
															<Button
																type="text"
																icon={<IconPaperclip size={16} />}
																aria-label={t(
																	"workflow.aside.attach",
																	"Attach an artifact",
																)}
																onClick={() => setAttaching(true)}
															/>
														</Tooltip>
													)
												)
											}
										/>
									);
								})}
							</div>
						</>
					)}
				</div>

				{curator && (
					<div className={styles.asideCurator}>
						<AppAvatar src={curator.image} size={40}>
							{curator.name?.[0]}
						</AppAvatar>
						<div className={styles.grow}>
							<Text strong>{curator.name}</Text>
							<Text type="secondary" className={styles.asideMeta}>
								{t("workflow.aside.curator", "Curator")}
							</Text>
						</div>
						<Tooltip title={t("workflow.aside.chat", "Checkpoint chat")}>
							<Button
								size="large"
								icon={<IconMessageCircle size={20} />}
								loading={openChat.isPending}
								onClick={chat}
								aria-label={t("workflow.aside.chat", "Checkpoint chat")}
							/>
						</Tooltip>
					</div>
				)}
			</div>

			{canManage && (
				<AttachEvidenceModal
					open={attaching}
					checkpoint={checkpoint}
					onClose={() => setAttaching(false)}
				/>
			)}
		</section>
	);
}
