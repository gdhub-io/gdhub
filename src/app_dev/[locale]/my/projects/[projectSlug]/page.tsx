"use client";

import { useSession } from "next-auth/react";
import WorkflowContent from "@/components/WorkflowContent";
import { useCurrentProject } from "@/hooks/project";

export default function MyProjectWorkflowPage() {
	const { project } = useCurrentProject();
	const { data: session } = useSession();

	return <>{project && <WorkflowContent projectId={project.id} locale={session?.user.lang} />}</>;
}
