import VacanciesList from '@/components/VacanciesList'
import { PublicLayout } from '@/layouts/PublicLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { useTolgee } from '@tolgee/react'
import { useRouter } from 'next/router'
import styles from './style.module.scss'

const VacanciesPage: NextPageWithLayout = ({ projects }: any) => {
	const { t } = useTolgee()
	const router = useRouter()

	return (
		<PublicLayout
			title={t('Vacancies')}
			seo={{ description: t('Vacancies for indie projects for enterprising specialists in the gaming industry') }}
		>
			<div className={styles.container}>
				<div className="project-vacancies">
					<VacanciesList />
				</div>
			</div>
		</PublicLayout>
	)
}

export default VacanciesPage
