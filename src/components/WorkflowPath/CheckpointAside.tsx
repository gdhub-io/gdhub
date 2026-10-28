"use client";

import { IconPaperclip } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { App, Button, Tag, Tooltip, Typography } from "antd";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useChat } from "@/components/Chat/useChat";
import { AttachEvidenceModal } from "@/components/checkpoints/AttachEvidenceModal";
import WorkflowTaskCard from "@/components/WorkflowContent/WorkflowTaskCard";
import {
	CheckpointCuratorKind,
	CheckpointItemKind,
} from "@/config/prisma-enums";
import { useCheckpointChat } from "@/hooks/checkpoints";
import type { CheckpointArtifactRef, CheckpointDto } from "@/types/checkpoints";
import { ArtifactLink } from "./ArtifactLink";
import { AsideHead } from "./AsideHead";
import { CuratorNote } from "./CuratorNote";
import { formatDayRange } from "./dates";
import styles from "./style.module.scss";

const { Text } = Typography;

export type CheckpointAsideProps = {
	checkpoint: CheckpointDto;
	canManage: boolean;
	withCurator?: boolean;
};

/**
 * Frame 08 (`RV1gV`): the running checkpoint at a glance beside the path — the
 * curator's last word and what it asks, the goal, and the tasks with what
 * proves them.
 */
export function CheckpointAside({
	checkpoint,
	canManage,
	withCurator = true,
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
	const curator = checkpoint.curator;
	const { slug } = useParams<{ slug: string }>();
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
		<section className={`${styles.asideCard} ${styles.asideCheckpoint}`}>
			{withCurator && (curator || isAI) && (
				<CuratorNote
					checkpoint={checkpoint}
					reviewHref={(index) =>
						`/user/project/${slug}/workflow/cp${checkpoint.number ?? 1}/review/${index}`
					}
					onChat={chat}
					chatLoading={openChat.isPending}
				/>
			)}
			<AsideHead
				title={t("workflow.aside.checkpoint", "Checkpoint {number}", {
					number: String(checkpoint.number ?? 1),
				})}
				badge={
					isAI && (
						<Tag className="gd-tag-on-page">{t("workflow.aside.ai", "AI")}</Tag>
					)
				}
				extra={
					checkpoint.startedAt &&
					checkpoint.dueAt &&
					formatDayRange(checkpoint.startedAt, checkpoint.dueAt)
				}
			/>

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
							<Text type="secondary" strong className={styles.asideMeta}>
								{t("workflow.aside.tasks", "Tasks")}
							</Text>
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
