import VacanciesList from '@/components/VacanciesList'
import { PublicLayout } from '@/layouts/PublicLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { useTranslate } from '@tolgee/react'
import styles from './style.module.scss'

const JobsPage: NextPageWithLayout = ({ projects }: any) => {
	const { t } = useTranslate()

	return (
		<PublicLayout
			title={t('Jobs in game industry')}
			subTitle="Open positions for anyone willing to invest their time in bringing new indie games to life"
			seo={{ description: t('for enterprising specialists in the gaming industry') }}
			backgroundImage="https://cdn.sanity.io/images/3ao2jrg0/prod/e3fd43a88ee86de839cdd75927ca3ee9d4d12789-1920x300.png"
		>
			<div className={styles.container}>
				<div className="project-vacancies">
					<VacanciesList />
				</div>
			</div>
		</PublicLayout>
	)
}

export default JobsPage
