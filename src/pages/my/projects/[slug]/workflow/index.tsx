import { ProtectedProjectLayout } from '@/layouts/ProtectedProjectLayout'
import { useTolgee } from '@tolgee/react'
import { Alert } from 'antd'

export const MyProjectWorkflowPage = () => {
	const { t } = useTolgee()

	return (
		<ProtectedProjectLayout title={t('Workflow')}>
			<Alert type="info" message={t('The section in development.')} />
		</ProtectedProjectLayout>
	)
}

export default MyProjectWorkflowPage
