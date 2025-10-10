import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { useRouter } from "next/navigation";
import { WorkflowEditor } from "@/components/admin/WorkflowEditor";
import { ProtectedLayout } from "@/layouts/ProtectedLayout";
import type { NextPageWithLayout } from "@/pages/_app";

const ProjectWorkflowEditPage: NextPageWithLayout = () => {
	const router = useRouter();
	const { id } = router.query;

	if (!id || typeof id !== "string") {
		return <div>Loading...</div>;
	}

	return <WorkflowEditor id={id} type="project" />;
};

ProjectWorkflowEditPage.getLayout = (page) => (
	<ProtectedLayout access={[prismaClient.UserRole.Admin]}>{page}</ProtectedLayout>
);

export default ProjectWorkflowEditPage;
