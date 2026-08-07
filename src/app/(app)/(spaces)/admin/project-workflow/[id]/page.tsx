"use client";

import { useParams } from "next/navigation";
import { ProjectWorkflowEditor } from "@/components/admin/workflow/ProjectWorkflowEditor";
import { AdminSpace } from "@/components/spaces/AdminSpace";

export default function ProjectWorkflowEditPage() {
	const params = useParams<{ id?: string }>();
	const id = params?.id;

	if (!id || typeof id !== "string") {
		return (
			<AdminSpace>
				<div>Loading...</div>
			</AdminSpace>
		);
	}

	return (
		<AdminSpace>
			<ProjectWorkflowEditor id={id} />
		</AdminSpace>
	);
}
