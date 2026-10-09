import { IconArrowUpRight } from "@tabler/icons-react";
import { Typography } from "antd";
import { artifactIcon } from "@/components/checkpoints/ArtifactPicker";
import { useArtifactTypeLabel } from "@/components/checkpoints/artifactType";
import type { CheckpointArtifactRef } from "@/types/checkpoints";
import styles from "./style.module.scss";

/** A done task's proof: what kind of artifact it is, opening the artifact itself. */
export function ArtifactLink({
	artifact,
}: {
	artifact: CheckpointArtifactRef;
}) {
	const typeLabel = useArtifactTypeLabel();
	const TypeIcon = artifactIcon(artifact.type);

	return (
		<Typography.Link
			href={artifact.link}
			target="_blank"
			rel="noreferrer"
			className={styles.link}
		>
			<TypeIcon size={14} />
			{typeLabel(artifact.type)}
			<IconArrowUpRight size={14} />
		</Typography.Link>
	);
}
