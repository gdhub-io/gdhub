import MyProjectDocuments from '@/components/MyProjectDocuments'
import { ProtectedProjectLayout } from '@/layouts/ProtectedProjectLayout'
import { useTolgee } from '@tolgee/react'

export const MyProjectVacanciesPage = () => {
	const { t } = useTolgee()

	return (
		<ProtectedProjectLayout
			title={t('project.documents.title', 'Documents')}
			description={t('project.documents.description', 'Game design documents, legal documents, etc.')}
		>
			<MyProjectDocuments />
		</ProtectedProjectLayout>
	)
}

export default MyProjectVacanciesPage
