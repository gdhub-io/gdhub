import {
	type Icon,
	IconArrowUpRight,
	IconFileText,
	IconPackage,
	IconPhoto,
	IconVideo,
} from "@tabler/icons-react";
import { Typography } from "antd";
import { useArtifactTypeLabel } from "@/components/checkpoints/artifactType";
import { ProjectArtifactType } from "@/config/prisma-enums";
import type { CheckpointArtifactRef } from "@/types/checkpoints";
import styles from "./style.module.scss";

const TYPE_ICON: Partial<Record<ProjectArtifactType, Icon>> = {
	[ProjectArtifactType.GameplayVideo]: IconVideo,
	[ProjectArtifactType.PrototypeVideo]: IconVideo,
	[ProjectArtifactType.ExecutableBuild]: IconPackage,
	[ProjectArtifactType.Art]: IconPhoto,
};

/** A done task's proof: what kind of artifact it is, opening the artifact itself. */
export function ArtifactLink({
	artifact,
}: {
	artifact: CheckpointArtifactRef;
}) {
	const typeLabel = useArtifactTypeLabel();
	const TypeIcon = TYPE_ICON[artifact.type] ?? IconFileText;

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
