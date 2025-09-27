import WorkflowContent from '@/components/WorkflowContent'
import { useCurrentProject } from '@/hooks/project'
import { ProtectedProjectLayout } from '@/layouts/ProtectedProjectLayout'
import { useTolgee } from '@tolgee/react'
import { useSession } from 'next-auth/react'

export const MyProjectWorkflowPage = () => {
	const { t } = useTolgee()
	const { project } = useCurrentProject()
	const { data: session } = useSession()

	return (
		<ProtectedProjectLayout title={t('Roadmap')}>
			{!!project && <WorkflowContent projectId={project.id} locale={session?.user.lang} />}
		</ProtectedProjectLayout>
	)
}

export default MyProjectWorkflowPage
