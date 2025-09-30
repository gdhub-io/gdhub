import VacanciesList from '@/components/VacanciesList'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { useTranslate } from '@tolgee/react'
import { useRouter } from 'next/router'
import styles from './style.module.scss'

const VacanciesPage: NextPageWithLayout = ({ projects }: any) => {
	const router = useRouter()
	const { t } = useTranslate()

	return (
		<ProtectedLayout
			title={t('page.vacancies.title', 'Vacancies')}
			subTitle={t('page.vacancies.subTitle', 'Invest your time in the success of new game projects')}
			seo={{ openGraph: { type: 'website', url: router.asPath } }}
		>
			<div className={styles.container}>
				<div className="project-vacancies" style={{ marginTop: 32 }}>
					<VacanciesList location="hub" />
				</div>
			</div>
		</ProtectedLayout>
	)
}

export default VacanciesPage
