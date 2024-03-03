import MyProjectCandidates from '@/components/MyProjectCandidates'
import MyProjectVacancies from '@/components/MyProjectVacancies'
import { ProtectedProjectLayout } from '@/layouts/ProtectedProjectLayout'
import { useTolgee } from '@tolgee/react'

export const MyProjectVacanciesPage = () => {
	const { t } = useTolgee()

	return (
		<ProtectedProjectLayout title={t('Project Vacancies')}>
			<MyProjectVacancies />
			<MyProjectCandidates />
		</ProtectedProjectLayout>
	)
}

export default MyProjectVacanciesPage
