import { useRouter } from "next/router";
import { WorkflowEditor } from "@/components/admin/WorkflowEditor";
import { AdminLayout } from "@/layouts/AdminLayout";
import type { NextPageWithLayout } from "@/pages/_app";

const ProjectWorkflowEditPage: NextPageWithLayout = () => {
	const router = useRouter();
	const { id } = router.query;

	if (!id || typeof id !== "string") {
		return <div>Loading...</div>;
	}

	return <WorkflowEditor id={id} type="project" />;
};

ProjectWorkflowEditPage.getLayout = (page) => <AdminLayout>{page}</AdminLayout>;

export default ProjectWorkflowEditPage;
