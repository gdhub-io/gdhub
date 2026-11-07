"use client";

import { useTranslate } from "@tolgee/react";
import { ProjectSpace } from "@/components/spaces/ProjectSpace";
import { WorkflowPath } from "@/components/WorkflowPath";
import { PathSkeleton } from "@/components/WorkflowPath/PathSkeleton";
import { useCurrentProject } from "@/hooks/project";

export default function MyProjectWorkflowPage() {
	const { t } = useTranslate();
	const { project } = useCurrentProject();

	return (
		<ProjectSpace title={t("Workflow")}>
			{project ? (
				<WorkflowPath
					project={{ id: project.id, name: project.name, slug: project.slug }}
				/>
			) : (
				<PathSkeleton />
			)}
		</ProjectSpace>
	);
}
