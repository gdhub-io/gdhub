"use client";

import { IconPaperclip } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Flex, Typography } from "antd";
import dayjs from "dayjs";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusDot } from "@/components/ui/StatusDot";
import { ArtifactCheckStatus } from "@/config/prisma-enums";
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

	if (!facts.proved.length)
		return (
			<EmptyState
				icon={IconPaperclip}
				title={t("checkpoints.evidence.empty", "No evidence yet")}
				description={t(
					"checkpoints.evidence.emptyNote",
					"Attach what proves an outcome as it lands, rather than on the last day.",
				)}
			/>
		);

	return (
		<div className={styles.card}>
			<Flex
				align="center"
				justify="space-between"
				gap={12}
				className={styles.cardHead}
			>
				<Typography.Text className={styles.cardTitle}>
					{t("checkpoints.evidence.attached", "Attached this sprint")}
				</Typography.Text>
				<Typography.Text type="secondary" className={styles.cardMeta}>
					{facts.proved.length}
				</Typography.Text>
			</Flex>

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
							<Flex vertical gap={2} flex={1} className={styles.rowBody}>
								<Typography.Text className={styles.rowText}>
									{item.artifact.name ?? item.artifact.link}
								</Typography.Text>
								<Typography.Text type="secondary" className={styles.rowMeta}>
									{[
										item.artifact.type,
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
		</div>
	);
}
