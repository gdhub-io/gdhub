import MyProjectDocuments from '@/components/MyProjectDocuments'
import { ProtectedProjectLayout } from '@/layouts/ProtectedProjectLayout'
import { useTranslate } from '@tolgee/react'

export const MyProjectVacanciesPage = () => {
	const { t } = useTranslate()

	return (
		<ProtectedProjectLayout
			title={t('project.documents.title', 'Documents')}
			description={t(
				'project.documents.description',
				'Links to project-specific documents accessible to you and your team'
			)}
		>
			<MyProjectDocuments />
		</ProtectedProjectLayout>
	)
}

export default MyProjectVacanciesPage
