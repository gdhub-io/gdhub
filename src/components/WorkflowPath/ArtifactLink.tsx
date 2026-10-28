import { IconArrowUpRight, IconX } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Flex, Tooltip, Typography } from "antd";
import { artifactIcon } from "@/components/checkpoints/ArtifactPicker";
import { useArtifactTypeLabel } from "@/components/MyProjectArtifacts/labels";
import type { CheckpointArtifactRef } from "@/types/checkpoints";
import styles from "./style.module.scss";

/**
 * A done task's proof by its name, its kind as the icon, opening the artifact
 * itself; a task with several needs the names apart. `compact` is
 * the icon alone, for the narrow aside; its name moves to a tooltip.
 */
export function ArtifactLink({
	artifact,
	compact = false,
}: {
	artifact: CheckpointArtifactRef;
	compact?: boolean;
}) {
	const typeLabel = useArtifactTypeLabel();
	const TypeIcon = artifactIcon(artifact.type);
	const name = artifact.name ?? typeLabel(artifact.type);

	if (compact) {
		return (
			<Tooltip title={name}>
				<Button
					type="text"
					href={artifact.link}
					target="_blank"
					rel="noreferrer"
					icon={<TypeIcon size={16} />}
					aria-label={name}
					className={styles.link}
				/>
			</Tooltip>
		);
	}

	return (
		<Tooltip title={typeLabel(artifact.type)}>
			<Typography.Link
				href={artifact.link}
				target="_blank"
				rel="noreferrer"
				className={styles.link}
			>
				<TypeIcon size={14} />
				{name}
				<IconArrowUpRight size={14} />
			</Typography.Link>
		</Tooltip>
	);
}

/**
 * A task's artifacts, one link each: stacked, or in a row when `compact`.
 * `onDetach` adds a remove beside each, for whoever may let one go.
 */
export function ArtifactLinks({
	artifacts,
	compact = false,
	onDetach,
}: {
	artifacts: CheckpointArtifactRef[];
	compact?: boolean;
	onDetach?: (artifactId: string) => void;
}) {
	const { t } = useTranslate();
	const label = t("checkpoints.evidence.detach", "Remove from this task");

	return (
		<Flex vertical={!compact} align={compact ? "center" : "end"} gap={4}>
			{artifacts.map((artifact) => (
				<Flex key={artifact.id} align="center" gap={4}>
					<ArtifactLink artifact={artifact} compact={compact} />
					{onDetach && (
						<Tooltip title={label}>
							<Button
								type="text"
								size="small"
								icon={<IconX size={14} />}
								aria-label={label}
								onClick={() => onDetach(artifact.id)}
							/>
						</Tooltip>
					)}
				</Flex>
			))}
		</Flex>
	);
}
