import { WorkflowEditor } from '@/components/admin/WorkflowEditor'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { useRouter } from 'next/router'

const WorkflowEditorAdminPage: NextPageWithLayout = () => {
	const router = useRouter()
	const { id: workflowId } = router.query as { id: string }

	return <WorkflowEditor id={workflowId} />
}

WorkflowEditorAdminPage.getLayout = (page) => (
	<ProtectedLayout access={[prismaClient.UserRole.Admin]}>{page}</ProtectedLayout>
)

export default WorkflowEditorAdminPage
