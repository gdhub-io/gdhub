import VacanciesList from '@/components/VacanciesList'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { useTolgee } from '@tolgee/react'
import { useRouter } from 'next/router'
import styles from './style.module.scss'

const VacanciesPage: NextPageWithLayout = ({ projects }: any) => {
	const router = useRouter()
	const { t } = useTolgee()

	return (
		<ProtectedLayout title={t('Vacancies')} seo={{ openGraph: { type: 'website', url: router.asPath } }}>
			<div className={styles.container}>
				<div className="project-vacancies">
					<VacanciesList />
				</div>
			</div>
		</ProtectedLayout>
	)
}

export default VacanciesPage
