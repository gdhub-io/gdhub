"use client";

import { useTranslate } from "@tolgee/react";
import MyProjectArtifacts from "@/components/MyProjectArtifacts";
import { ProjectSpace } from "@/components/spaces/ProjectSpace";

export default function MyProjectArtifactsPage() {
	const { t } = useTranslate();

	return (
		<ProjectSpace
			title={t("project.documents.title", "Documents")}
			description={t(
				"project.documents.description",
				"Links to project-specific documents accessible to you and your team",
			)}
		>
			<MyProjectArtifacts />
		</ProjectSpace>
	);
}
