"use client";

import { useTranslate } from "@tolgee/react";
import { CheckpointsList } from "@/components/checkpoints/CheckpointsList";
import { StartCheckpointButton } from "@/components/checkpoints/StartCheckpointButton";
import { ProjectSpace } from "@/components/spaces/ProjectSpace";
import { useCurrentProject } from "@/hooks/project";

export default function ProjectCheckpointsPage() {
	const { t } = useTranslate();
	const { project } = useCurrentProject();

	return (
		<ProjectSpace
			title={t("checkpoints.title", "Checkpoints")}
			description={t(
				"checkpoints.subtitle",
				"28 days on one project with a stated goal and a verdict at the end.",
			)}
			actions={
				<StartCheckpointButton
					projectId={project?.id}
					projectSlug={project?.slug}
				/>
			}
		>
			<CheckpointsList />
		</ProjectSpace>
	);
}
