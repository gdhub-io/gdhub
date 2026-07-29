"use client";

import { useTranslate } from "@tolgee/react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useCurrentProject } from "@/hooks/project";
import { ProtectedProjectLayout } from "@/layouts/ProtectedProjectLayout";

const WorkflowContent = dynamic(() => import("@/components/WorkflowContent"), {
	ssr: false,
});

export default function MyProjectHomePage() {
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
}
