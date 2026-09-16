"use client";

import { useTranslate } from "@tolgee/react";
import { CheckpointsList } from "@/components/checkpoints/CheckpointsList";
import { ProjectSpace } from "@/components/spaces/ProjectSpace";

export default function ProjectCheckpointsPage() {
	const { t } = useTranslate();

	return (
		<ProjectSpace
			title={t("checkpoints.title", "Checkpoints")}
			description={t("checkpoints.subtitle", "The project cycles")}
		>
			<CheckpointsList />
		</ProjectSpace>
	);
}
