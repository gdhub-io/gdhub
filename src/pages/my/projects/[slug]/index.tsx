import WorkflowContent from '@/components/WorkflowContent'
import { useCurrentProject } from '@/hooks/project'
import { ProtectedProjectLayout } from '@/layouts/ProtectedProjectLayout'
import { useTolgee } from '@tolgee/react'

export const MyProjectWorkflowPage = () => {
	const { t } = useTolgee()
	const { project } = useCurrentProject()

	return (
		<ProtectedProjectLayout title={t('Workflow')}>
			{!!project && <WorkflowContent projectId={project.id} />}
		</ProtectedProjectLayout>
	)
}

export default MyProjectWorkflowPage
