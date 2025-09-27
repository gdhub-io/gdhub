import MyProjectCandidates from '@/components/MyProjectCandidates'
import MyProjectVacancies from '@/components/MyProjectVacancies'
import { ProtectedProjectLayout } from '@/layouts/ProtectedProjectLayout'
import { useTranslate } from '@tolgee/react'

export const MyProjectVacanciesPage = () => {
	const { t } = useTranslate()

	return (
		<ProtectedProjectLayout title={t('Project Vacancies')}>
			<MyProjectVacancies />
			<MyProjectCandidates />
		</ProtectedProjectLayout>
	)
}

export default MyProjectVacanciesPage
