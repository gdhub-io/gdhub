"use client";

import { useParams } from "next/navigation";
import { WorkflowEditor } from "@/components/admin/WorkflowEditor";
import { AdminLayout } from "@/layouts/AdminLayout";

export default function ProjectWorkflowEditPage() {
	const params = useParams<{ id?: string }>();
	const id = params?.id;

	if (!id || typeof id !== "string") {
		return (
			<AdminLayout>
				<div>Loading...</div>
			</AdminLayout>
		);
	}

	return (
		<AdminLayout>
			<WorkflowEditor id={id} type="project" />
		</AdminLayout>
	);
}
