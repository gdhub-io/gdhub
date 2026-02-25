import { useRouter } from "next/router";
import { WorkflowEditor } from "@/components/admin/WorkflowEditor";
import { AdminLayout } from "@/layouts/AdminLayout";
import type { NextPageWithLayout } from "@/pages/_app";

const WorkflowEditorAdminPage: NextPageWithLayout = () => {
	const router = useRouter();
	const { id: workflowId } = router.query as { id: string };

	return <WorkflowEditor id={workflowId} />;
};

WorkflowEditorAdminPage.getLayout = (page) => <AdminLayout>{page}</AdminLayout>;

export default WorkflowEditorAdminPage;
