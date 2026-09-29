import { IconCheck, IconMinus } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Flex, Tooltip, Typography } from "antd";
import clsx from "clsx";
import type { CheckpointItemDto } from "@/types/checkpoints";
import { useArtifactTypeLabel } from "../artifactType";
import styles from "./style.module.scss";

/**
 * The checkpoint's outcomes as squares: filled once evidence is attached. The
 * wording lives in the workflow and on the checkpoint page, so here a line is
 * only named on hover.
 */
export function TaskSquares({ items }: { items: CheckpointItemDto[] }) {
	const { t } = useTranslate();
	const typeLabel = useArtifactTypeLabel();

	// A cut line is shown but never counted as missing evidence.
	const live = items.filter((item) => !item.cut);
	const withEvidence = live.filter((item) => item.artifact).length;
	const reworded = items.some((item) => item.originalText);
	const cut = items.length > live.length;

	return (
		<Flex gap={16} align="center" wrap>
			<Typography.Text strong>
				{t("checkpoints.card.tasks", "Checkpoint tasks")}
			</Typography.Text>
			<Flex gap={6} align="center">
				{items.map((item) => (
					<Tooltip
						key={item.id}
						title={
							<Flex vertical gap={4}>
								<span className={clsx(item.cut && styles.struck)}>
									{item.text}
								</span>
								{item.originalText && (
									<span className={styles.tipMuted}>
										{t("checkpoints.card.taskWas", "Was: {text}", {
											text: item.originalText,
										})}
									</span>
								)}
								<span className={styles.tipMuted}>
									{item.cut
										? t("checkpoints.card.taskCut", "Cut on day 14")
										: item.artifact
											? t("checkpoints.card.taskEvidence", "Evidence: {name}", {
													name:
														item.artifact.name ?? typeLabel(item.artifact.type),
												})
											: t("checkpoints.card.taskNoEvidence", "No evidence yet")}
								</span>
							</Flex>
						}
					>
						{/* ui-guard-ignore a status square with a corner mark; antd Checkbox is an input, these are read-only */}
						<span
							className={clsx(
								styles.square,
								item.cut
									? styles.squareCut
									: item.artifact && styles.squareDone,
							)}
						>
							{item.cut ? (
								<IconMinus size={12} stroke={2} />
							) : (
								item.artifact && <IconCheck size={12} stroke={2.5} />
							)}
							{item.originalText && !item.cut && (
								<span className={styles.reworded} />
							)}
						</span>
					</Tooltip>
				))}
			</Flex>
			<Typography.Text className={styles.muted}>
				{t("checkpoints.card.tasksCount", "{done} of {total} with evidence", {
					done: withEvidence,
					total: live.length,
				})}
			</Typography.Text>
			{(reworded || cut) && (
				<Flex gap={16} align="center" className={styles.legend}>
					{reworded && (
						<Flex gap={6} align="center">
							<span className={styles.legendDot} />
							<Typography.Text className={styles.muted}>
								{t("checkpoints.card.legendReworded", "Reworded on day 14")}
							</Typography.Text>
						</Flex>
					)}
					{cut && (
						<Flex gap={6} align="center">
							<span
								className={clsx(
									styles.square,
									styles.squareCut,
									styles.legendSquare,
								)}
							>
								<IconMinus size={8} stroke={2} />
							</span>
							<Typography.Text className={styles.muted}>
								{t("checkpoints.card.legendCut", "Cut on day 14 · not counted")}
							</Typography.Text>
						</Flex>
					)}
				</Flex>
			)}
		</Flex>
	);
}
