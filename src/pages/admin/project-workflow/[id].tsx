import { WorkflowEditor } from '@/components/admin/WorkflowEditor'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { useRouter } from 'next/router'

const ProjectWorkflowEditPage: NextPageWithLayout = () => {
	const router = useRouter()
	const { id } = router.query

	if (!id || typeof id !== 'string') {
		return <div>Loading...</div>
	}

	return <WorkflowEditor id={id} type="project" />
}

ProjectWorkflowEditPage.getLayout = (page) => (
	<ProtectedLayout access={[prismaClient.UserRole.Admin]}>{page}</ProtectedLayout>
)

export default ProjectWorkflowEditPage
