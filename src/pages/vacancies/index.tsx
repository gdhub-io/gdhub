import VacanciesList from '@/components/VacanciesList'
import { PublicLayout } from '@/layouts/PublicLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { useTolgee } from '@tolgee/react'
import styles from './style.module.scss'

const VacanciesPage: NextPageWithLayout = ({ projects }: any) => {
	const { t } = useTolgee()

	return (
		<PublicLayout
			title={t('Vacancies')}
			subTitle="for enterprising specialists in the gaming industry"
			seo={{ description: t('for enterprising specialists in the gaming industry') }}
			backgroundImage="https://cdn.sanity.io/images/3ao2jrg0/prod/f652fd9ac43f4b555c990db0265cef66ab5fdaf1-1920x1080.png"
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
