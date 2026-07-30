"use client";

import { useParams } from "next/navigation";
import { WorkflowEditor } from "@/components/admin/WorkflowEditor";
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
			<WorkflowEditor id={id} type="project" />
		</AdminSpace>
	);
}
