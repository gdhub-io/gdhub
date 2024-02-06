import VacanciesList from '@/components/VacanciesList'
import { PublicLayout } from '@/layouts/PublicLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { Grid } from 'antd'
import Head from 'next/head'
import styles from './style.module.scss'

const VacanciesPage: NextPageWithLayout = ({ projects }: any) => {
	const screens = Grid.useBreakpoint()

	return (
		<PublicLayout title="Вакансии">
			<Head>
				<title>Вакансии на проекты сообщества</title>
				<meta property="og:title" content="Вакансии на проекты сообщества" />
				<meta property="og:type" content="website" />
				<meta property="og:url" content="/projects" />
			</Head>
			<div className={styles.container}>
				<div className="project-vacancies">
					<VacanciesList />
				</div>
			</div>
		</PublicLayout>
	)
}

export default VacanciesPage
