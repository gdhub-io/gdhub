"use client";

import { useTranslate } from "@tolgee/react";
import { CheckpointsList } from "@/components/checkpoints/CheckpointsList";
import { ProjectSpace } from "@/components/spaces/ProjectSpace";

export default function ProjectCheckpointsPage() {
	const { t } = useTranslate();

	return (
		<ProjectSpace
			title={t("checkpoints.title", "Checkpoints")}
			description={t(
				"checkpoints.subtitle",
				"28 days on one project with a stated goal and a verdict at the end.",
			)}
		>
			<CheckpointsList />
		</ProjectSpace>
	);
}
