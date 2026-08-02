"use client";

import { useTranslate } from "@tolgee/react";
import { useContext } from "react";
import { useAccess } from "@/components/access/AccessProvider";
import MyTeam from "@/components/MyTeam";
import { ProjectSpace } from "@/components/spaces/ProjectSpace";
import UserTeam from "@/components/UserTeam";
import { ProjectContext } from "@/contexts/ProjectContext";

const RenderTeam = () => {
	const contextProject = useContext(ProjectContext);
	const { can } = useAccess();

	// An archived project revokes `*.invite` server-side, so this single check
	// covers both "may manage the team" and "the project is not frozen".
	return can("project.members.invite") && contextProject?.isLoaded ? (
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
