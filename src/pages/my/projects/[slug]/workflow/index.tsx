import WorkflowContent from '@/components/WorkflowContent'
import { useCurrentProject } from '@/hooks/project'
import { ProtectedProjectLayout } from '@/layouts/ProtectedProjectLayout'
import { useTolgee } from '@tolgee/react'
import { Alert } from 'antd'

export const MyProjectWorkflowPage = () => {
	const { t } = useTolgee()
	const { project } = useCurrentProject()

	return (
		<ProtectedProjectLayout title={t('Workflow')}>
			<Alert type="info" message={t('The section in development')} />

			{!!project && <WorkflowContent projectId={project.id} />}
		</ProtectedProjectLayout>
	)
}

export default MyProjectWorkflowPage
