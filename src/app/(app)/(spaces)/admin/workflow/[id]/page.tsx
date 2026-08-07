"use client";

import { useParams } from "next/navigation";
import { TemplateEditor } from "@/components/admin/workflow/TemplateEditor";
import { AdminSpace } from "@/components/spaces/AdminSpace";

export default function WorkflowEditorAdminPage() {
	const params = useParams<{ id?: string }>();
	const workflowId = params?.id as string;

	return (
		<AdminSpace>
			<TemplateEditor id={workflowId} />
		</AdminSpace>
	);
}
