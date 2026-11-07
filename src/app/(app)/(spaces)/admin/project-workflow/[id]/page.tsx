"use client";

import { useParams } from "next/navigation";
import { ProjectWorkflowEditor } from "@/components/admin/workflow/ProjectWorkflowEditor";
import { AdminSpace } from "@/components/spaces/AdminSpace";

export default function ProjectWorkflowEditPage() {
	// The route segment is `[id]`, so the param is always there.
	const { id } = useParams<{ id: string }>();

	return (
		<AdminSpace>
			<ProjectWorkflowEditor id={id} />
		</AdminSpace>
	);
}
