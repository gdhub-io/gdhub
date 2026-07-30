"use client";

import { useTranslate } from "@tolgee/react";
import { useContext } from "react";
import MyTeam from "@/components/MyTeam";
import { ProjectSpace } from "@/components/spaces/ProjectSpace";
import UserTeam from "@/components/UserTeam";
import { ProjectContext } from "@/contexts/ProjectContext";

const RenderTeam = () => {
	const contextProject = useContext(ProjectContext);

	return contextProject?.contextProject?.isProjectAuthor &&
		!contextProject?.contextProject?.isProjectArchived &&
		contextProject?.isLoaded ? (
		<MyTeam />
	) : (
		<UserTeam />
	);
};

export default function MyProjectTeamPage() {
	const { t } = useTranslate();

	return (
		<ProjectSpace title={t("Project Team")}>
			<RenderTeam />
		</ProjectSpace>
	);
}
