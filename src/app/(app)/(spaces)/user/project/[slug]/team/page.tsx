"use client";

import { useTranslate } from "@tolgee/react";
import { useAccess } from "@/components/access/AccessProvider";
import MyTeam from "@/components/MyTeam";
import { ProjectSpace } from "@/components/spaces/ProjectSpace";
import UserTeam from "@/components/UserTeam";

const RenderTeam = () => {
	const { can } = useAccess();

	// An archived project revokes `*.invite` server-side, so this single check
	// covers both "may manage the team" and "the project is not frozen". It comes
	// with the page, so the layout is chosen before the project loads.
	return can("project.members.invite") ? <MyTeam /> : <UserTeam />;
};

export default function MyProjectTeamPage() {
	const { t } = useTranslate();

	return (
		<ProjectSpace title={t("Project Team")}>
			<RenderTeam />
		</ProjectSpace>
	);
}
