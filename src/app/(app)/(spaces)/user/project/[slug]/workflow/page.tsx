"use client";

import { useTranslate } from "@tolgee/react";
import { useSession } from "next-auth/react";
import { ProjectSpace } from "@/components/spaces/ProjectSpace";
import WorkflowContent from "@/components/WorkflowContent";
import { useCurrentProject } from "@/hooks/project";

/**
 * Same content as the space root on purpose: the root is expected to become a
 * project overview, and then the workflow keeps living on this dedicated URL.
 */
export default function MyProjectWorkflowPage() {
	const { t } = useTranslate();
	const { project } = useCurrentProject();
	const { data: session } = useSession();

	return (
		<ProjectSpace title={t("Workflow")}>
			{!!project && (
				<WorkflowContent
					projectId={project.id}
					projectSlug={project.slug}
					locale={session?.user.lang}
				/>
			)}
		</ProjectSpace>
	);
}
