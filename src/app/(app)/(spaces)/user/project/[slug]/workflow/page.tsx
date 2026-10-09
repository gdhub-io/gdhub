"use client";

import { useTranslate } from "@tolgee/react";
import { useSession } from "next-auth/react";
import { ProjectSpace } from "@/components/spaces/ProjectSpace";
import { WorkflowPath } from "@/components/WorkflowPath";
import { useCurrentProject } from "@/hooks/project";

export default function MyProjectWorkflowPage() {
	const { t } = useTranslate();
	const { project } = useCurrentProject();
	const { data: session } = useSession();

	return (
		<ProjectSpace title={t("Workflow")}>
			{!!project && (
				<WorkflowPath
					project={{ id: project.id, name: project.name, slug: project.slug }}
					locale={session?.user.lang}
				/>
			)}
		</ProjectSpace>
	);
}
