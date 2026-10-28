import { IconArrowUpRight } from "@tabler/icons-react";
import { Button, Tooltip, Typography } from "antd";
import { artifactIcon } from "@/components/checkpoints/ArtifactPicker";
import { useArtifactTypeLabel } from "@/components/MyProjectArtifacts/labels";
import type { CheckpointArtifactRef } from "@/types/checkpoints";
import styles from "./style.module.scss";

/**
 * A done task's proof by its name, its kind as the icon, opening the artifact
 * itself; a task with several needs the names apart (GDHUB-115). `compact` is
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
