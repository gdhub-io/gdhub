import {
	IconChevronDown,
	IconChevronUp,
	IconCircle,
	IconCircleCheck,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { useState } from "react";
import { VerdictChip } from "@/components/checkpoints/VerdictChip";
import { AppAvatar } from "@/components/ui/AppAvatar";
import { CheckpointItemKind } from "@/config/prisma-enums";
import type { CheckpointDto } from "@/types/checkpoints";
import { ArtifactLink } from "./ArtifactLink";
import { formatRange, formatShort } from "./dates";
import styles from "./style.module.scss";

export type ClosedCheckpointProps = {
	checkpoint: CheckpointDto;
	number: number;
};

/**
 * Frame 07.1 (nBVNK): a checkpoint behind the project — its dates and verdict
 * folded, its goal, what was delivered and the curator's word open.
 */
export function ClosedCheckpoint({
	checkpoint,
	number,
}: ClosedCheckpointProps) {
	const { t } = useTranslate();
	const [open, setOpen] = useState(false);

	return (
		<div>
			{/* ui-guard-ignore the header row toggles the details below it */}
			<div
				role="button"
				tabIndex={0}
				aria-expanded={open}
				className={styles.closedHead}
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
						<span className={styles.meta}>
							{formatRange(checkpoint.startedAt, checkpoint.dueAt)}
						</span>
					)}
					<span className={styles.closedTitle}>
						<span className={styles.title}>
							{t("workflow.path.checkpoint.title", "Checkpoint {number}", {
								number: String(number),
							})}
						</span>
						{checkpoint.verdict && <VerdictChip verdict={checkpoint.verdict} />}
					</span>
				</div>
				<span className={styles.toggle}>
					{open ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
				</span>
			</div>

			{open && (
				<div className={styles.panel}>
					<CheckpointResult checkpoint={checkpoint} />
				</div>
			)}
		</div>
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
		<>
			<div className={styles.block}>
				<span className={styles.label}>
					{t("workflow.path.checkpoint.goal", "Goal")}
				</span>
				<span className={styles.prose}>{checkpoint.goal}</span>
			</div>

			{outcomes.length > 0 && (
				<div className={styles.block}>
					<div className={styles.sectionHead}>
						<span className={styles.sectionLabel}>
							{t("workflow.path.checkpoint.tasks", "Tasks")}
						</span>
						<span>
							{t("workflow.path.count", "{done} of {total}", {
								done: String(delivered),
								total: String(outcomes.length),
							})}
						</span>
					</div>
					{outcomes.map((item) => (
						<div key={item.id} className={styles.outcome}>
							{item.artifact ? (
								<IconCircleCheck size={16} className={styles.taskIconDone} />
							) : (
								<IconCircle size={16} className={styles.taskIcon} />
							)}
							<span
								className={`${styles.grow}${item.artifact ? "" : ` ${styles.secondary}`}`}
							>
								{item.text}
							</span>
							{item.artifact ? (
								<ArtifactLink artifact={item.artifact} />
							) : (
								<span className={styles.tertiary}>
									{t("workflow.path.checkpoint.not-delivered", "Not delivered")}
								</span>
							)}
						</div>
					))}
				</div>
			)}

			{checkpoint.verdict && (
				<>
					<div className={styles.divider} />
					<div className={styles.block}>
						<span className={styles.closedTitle}>
							<VerdictChip verdict={checkpoint.verdict} />
							{checkpoint.decidedAt && (
								<span className={styles.meta}>
									· {formatShort(checkpoint.decidedAt)}
								</span>
							)}
						</span>
						{checkpoint.verdictNote && (
							<span className={styles.prose}>{checkpoint.verdictNote}</span>
						)}
						{checkpoint.curator && (
							<span className={styles.closedTitle}>
								<AppAvatar src={checkpoint.curator.image} size={24}>
									{checkpoint.curator.name?.[0]}
								</AppAvatar>
								<span className={styles.meta}>{checkpoint.curator.name}</span>
							</span>
						)}
					</div>
				</>
			)}
		</>
	);
}
