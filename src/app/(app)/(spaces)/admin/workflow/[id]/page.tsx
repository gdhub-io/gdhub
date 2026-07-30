"use client";

import { useParams } from "next/navigation";
import { WorkflowEditor } from "@/components/admin/WorkflowEditor";
import { AdminSpace } from "@/components/spaces/AdminSpace";

export default function WorkflowEditorAdminPage() {
	const params = useParams<{ id?: string }>();
	const workflowId = params?.id as string;

	return (
		<AdminSpace>
			<WorkflowEditor id={workflowId} />
		</AdminSpace>
	);
}
