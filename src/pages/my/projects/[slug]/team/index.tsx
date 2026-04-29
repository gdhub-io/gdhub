import { useTranslate } from "@tolgee/react";
import { useContext } from "react";
import MyTeam from "@/components/MyTeam";
import UserTeam from "@/components/UserTeam";
import { ProjectContext } from "@/contexts/ProjectContext";
import { ProtectedProjectLayout } from "@/layouts/ProtectedProjectLayout";

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

export const MyProjectTeamPage = () => {
	const { t } = useTranslate();

	return (
		<ProtectedProjectLayout title={t("Project Team")}>
			<RenderTeam />
		</ProtectedProjectLayout>
	);
};

export default MyProjectTeamPage;
