"use client";

import { IconPaperclip } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Card, Flex, Typography } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { AttachEvidenceModal } from "@/components/checkpoints/AttachEvidenceModal";
import { useArtifactTypeLabel } from "@/components/MyProjectArtifacts/labels";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusDot } from "@/components/ui/StatusDot";
import { ArtifactCheckStatus, CheckpointStatus } from "@/config/prisma-enums";
import type { SprintFacts } from "@/lib/checkpoint-facts";
import type { CheckpointDto } from "@/types/checkpoints";
import styles from "./style.module.scss";

export type EvidenceProps = {
	checkpoint: CheckpointDto;
	facts: SprintFacts;
};

/**
 * What landed in this sprint and which line of the goal card it is offered
 * against. The project's own artifact store is the Artifacts tab; this is only
 * what is bound to an outcome.
 */
export function Evidence({ checkpoint, facts }: EvidenceProps) {
	const { t } = useTranslate();
	const typeLabel = useArtifactTypeLabel();
	const [attaching, setAttaching] = useState(false);

	// Once the verdict is written the card is the record, not a form.
	const canAttach =
		checkpoint.status === CheckpointStatus.Active ||
		checkpoint.status === CheckpointStatus.Draft;

	const check = (status: string | null) => {
		if (status === ArtifactCheckStatus.Readable)
			return {
				tone: "success" as const,
				label: t("artifacts.check.ready", "Ready"),
			};
		if (status === ArtifactCheckStatus.Unreachable)
			return {
				tone: "danger" as const,
				label: t("artifacts.check.unreachable", "Cannot be opened"),
			};
		if (status === ArtifactCheckStatus.Unsupported)
			return {
				tone: "warning" as const,
				label: t("artifacts.check.unsupported", "Saved, not readable"),
			};

		return {
			tone: "neutral" as const,
			label: t("artifacts.check.pending", "Checking…"),
		};
	};

	const attachButton = (
		<Button
			icon={<IconPaperclip size={16} />}
			onClick={() => setAttaching(true)}
		>
			{t("checkpoints.evidence.attach", "Attach evidence")}
		</Button>
	);

	const modal = (
		<AttachEvidenceModal
			open={attaching}
			checkpoint={checkpoint}
			onClose={() => setAttaching(false)}
		/>
	);

	if (!facts.proved.length)
		return (
			<>
				<EmptyState
					icon={IconPaperclip}
					title={t("checkpoints.evidence.empty", "No evidence yet")}
					description={t(
						"checkpoints.evidence.emptyNote",
						"Attach what proves an outcome as it lands, rather than on the last day.",
					)}
					action={canAttach ? attachButton : undefined}
				/>
				{canAttach && modal}
			</>
		);

	return (
		<Card
			size="small"
			styles={{ body: { padding: 0 } }}
			title={
				<span className={styles.cardTitle}>
					{t("checkpoints.evidence.landed", "Landed in this sprint")}
				</span>
			}
			extra={
				<Typography.Text type="secondary" className={styles.cardMeta}>
					{facts.proved.length}
				</Typography.Text>
			}
		>
			<div className={styles.rows}>
				{facts.proved.map((item) => {
					const status = check(item.artifact.checkStatus);
					const proves = checkpoint.items.filter((line) =>
						item.itemIds.includes(line.id),
					);

					return (
						<Flex
							key={item.artifact.id}
							gap={12}
							align="center"
							className={styles.row}
						>
							<Flex vertical gap={4} flex={1} className={styles.rowBody}>
								<Typography.Text className={styles.rowText}>
									{item.artifact.name ?? item.artifact.link}
								</Typography.Text>
								<Typography.Text type="secondary" className={styles.rowMeta}>
									{[
										typeLabel(item.artifact.type),
										dayjs(item.addedAt).format("D MMM"),
										item.addedBy?.name,
									]
										.filter(Boolean)
										.join(" · ")}
								</Typography.Text>
								{proves.map((line) => (
									<Typography.Text
										key={line.id}
										type="secondary"
										className={styles.proves}
									>
										{t("checkpoints.evidence.proves", "Proves: {outcome}", {
											outcome: line.text,
										})}
									</Typography.Text>
								))}
							</Flex>

							<StatusDot tone={status.tone} label={status.label} />
						</Flex>
					);
				})}
			</div>

			{canAttach && (
				<div className={styles.cardFoot}>
					{attachButton}
					{modal}
				</div>
			)}
		</Card>
	);
}
