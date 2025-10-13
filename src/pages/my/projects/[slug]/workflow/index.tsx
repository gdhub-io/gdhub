import { useTranslate } from "@tolgee/react";
import { useSession } from "next-auth/react";
import WorkflowContent from "@/components/WorkflowContent";
import { useCurrentProject } from "@/hooks/project";
import { ProtectedProjectLayout } from "@/layouts/ProtectedProjectLayout";

export const MyProjectWorkflowPage = () => {
	const { t } = useTranslate();
	const { project } = useCurrentProject();
	const { data: session } = useSession();

	return (
		<ProtectedProjectLayout title={t("Workflow")}>
			{!!project && (
				<WorkflowContent projectId={project.id} locale={session?.user.lang} />
			)}
		</ProtectedProjectLayout>
	);
};

export default MyProjectWorkflowPage;
