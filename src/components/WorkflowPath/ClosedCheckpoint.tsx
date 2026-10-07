import {
	IconChevronDown,
	IconChevronUp,
	IconCircle,
	IconCircleCheck,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Flex, Typography } from "antd";
import { useState } from "react";
import { VerdictChip } from "@/components/checkpoints/VerdictChip";
import { AppAvatar } from "@/components/ui/AppAvatar";
import { ArtifactLink } from "@/components/WorkflowPath/ArtifactLink";
import { CheckpointItemKind } from "@/config/prisma-enums";
import type { CheckpointDto } from "@/types/checkpoints";
import { formatRange, formatShort } from "./dates";
import styles from "./style.module.scss";

const { Text } = Typography;

export type ClosedCheckpointProps = {
	checkpoint: CheckpointDto;
	number: number;
};

/**
 * A checkpoint behind the project: its dates and verdict folded, its goal,
 * what was delivered and the curator's word open.
 */
export function ClosedCheckpoint({
	checkpoint,
	number,
}: ClosedCheckpointProps) {
	const { t } = useTranslate();
	const [open, setOpen] = useState(false);

	return (
		<Flex vertical gap={16}>
			{/* ui-guard-ignore the header row toggles the details below it */}
			<div
				role="button"
				tabIndex={0}
				aria-expanded={open}
				className={styles.cardHead}
				onClick={() => setOpen((value) => !value)}
				onKeyDown={(event) => {
					if (event.key === "Enter" || event.key === " ") {
						event.preventDefault();
						setOpen((value) => !value);
					}
				}}
			>
				<div className={styles.cardTitles}>
					{checkpoint.startedAt && checkpoint.dueAt && (
						<Text className={styles.eyebrow}>
							{formatRange(checkpoint.startedAt, checkpoint.dueAt)}
						</Text>
					)}
					<Flex align="center" gap={12}>
						<Text className={styles.title}>
							{t("workflow.path.checkpoint.title", "Checkpoint {number}", {
								number: String(number),
							})}
						</Text>
						{checkpoint.verdict && <VerdictChip verdict={checkpoint.verdict} />}
					</Flex>
				</div>
				{open ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
			</div>

			{open && (
				<div className={styles.card}>
					<CheckpointResult checkpoint={checkpoint} />
				</div>
			)}
		</Flex>
	);
}

/** What a closed checkpoint came to: the goal, what was delivered, the verdict. */
export function CheckpointResult({
	checkpoint,
}: {
	checkpoint: CheckpointDto;
}) {
	const { t } = useTranslate();
	const outcomes = checkpoint.items.filter(
		(item) => item.kind === CheckpointItemKind.Outcome && !item.cut,
	);
	const delivered = outcomes.filter((item) => item.artifact).length;

	return (
		<Flex vertical gap={24}>
			<div className={styles.section}>
				<Text type="secondary">
					{t("workflow.path.checkpoint.goal", "Goal")}
				</Text>
				<Text>{checkpoint.goal}</Text>
			</div>

			{outcomes.length > 0 && (
				<div className={styles.section}>
					<div className={styles.sectionHead}>
						<Text type="secondary">
							{t("workflow.path.checkpoint.tasks", "Tasks")}
						</Text>
						<Text type="secondary">
							{t("workflow.path.count", "{done} of {total}", {
								done: String(delivered),
								total: String(outcomes.length),
							})}
						</Text>
					</div>
					{outcomes.map((item) => (
						<div key={item.id} className={styles.taskRow}>
							{item.artifact ? (
								<IconCircleCheck size={18} className={styles.taskIconDone} />
							) : (
								<IconCircle size={18} className={styles.taskIcon} />
							)}
							<Text className={styles.grow}>{item.text}</Text>
							{item.artifact ? (
								<ArtifactLink artifact={item.artifact} />
							) : (
								<Text type="secondary">
									{t("workflow.path.checkpoint.not-delivered", "Not delivered")}
								</Text>
							)}
						</div>
					))}
				</div>
			)}

			{checkpoint.verdict && (
				<Flex vertical gap={8}>
					<Flex align="center" gap={8}>
						<VerdictChip verdict={checkpoint.verdict} />
						{checkpoint.decidedAt && (
							<Text type="secondary">
								· {formatShort(checkpoint.decidedAt)}
							</Text>
						)}
					</Flex>
					{checkpoint.verdictNote && <Text>{checkpoint.verdictNote}</Text>}
					{checkpoint.curator && (
						<Flex align="center" gap={8}>
							<AppAvatar src={checkpoint.curator.image} size={20}>
								{checkpoint.curator.name?.[0]}
							</AppAvatar>
							<Text type="secondary">{checkpoint.curator.name}</Text>
						</Flex>
					)}
				</Flex>
			)}
		</Flex>
	);
}
