"use client";

import { useTranslate } from "@tolgee/react";
import MyProjectArtifacts from "@/components/MyProjectArtifacts";
import { ProjectSpace } from "@/components/spaces/ProjectSpace";

export default function MyProjectArtifactsPage() {
	const { t } = useTranslate();

	return (
		<ProjectSpace
			title={t("artifacts.page.title", "Artifacts")}
			description={t(
				"artifacts.page.description",
				"Project builds, videos, images and documents.",
			)}
		>
			<MyProjectArtifacts />
		</ProjectSpace>
	);
}
