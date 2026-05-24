"use client";

import { useParams } from "next/navigation";
import { WorkflowEditor } from "@/components/admin/WorkflowEditor";
import { AdminLayout } from "@/layouts/AdminLayout";

export default function WorkflowEditorAdminPage() {
	const params = useParams<{ id?: string }>();
	const workflowId = params?.id as string;

	return (
		<AdminLayout>
			<WorkflowEditor id={workflowId} />
		</AdminLayout>
	);
}
