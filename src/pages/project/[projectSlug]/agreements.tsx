import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { ProjectAgreementsApp } from "@/components/agreements/ProjectAgreementsApp";
import { ProtectedProjectLayout } from "@/layouts/ProtectedProjectLayout";
import type { NextPageWithLayout } from "@/pages/_app";

const ProjectAgreementsPage: NextPageWithLayout = () => {
	const router = useRouter();
	const { projectSlug } = router.query as { projectSlug: string };
	const { data: session } = useSession();

	const userName = session?.user?.name ?? "Unknown";

	// TODO: derive canManage from session roles / project membership check
	const canManage = true;

	return (
		<ProjectAgreementsApp
			projectId={projectSlug}
			projectName={projectSlug}
			authorName={userName}
			canManage={canManage}
		/>
	);
};

ProjectAgreementsPage.getLayout = (page) => (
	<ProtectedProjectLayout>{page}</ProtectedProjectLayout>
);

export default ProjectAgreementsPage;
