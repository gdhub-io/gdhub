import CoursesList from '@/components/CoursesList'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { useTranslate } from '@tolgee/react'
import { useRouter } from 'next/router'
import styles from './style.module.scss'

const CoursesPage: NextPageWithLayout = ({ projects }: any) => {
	const router = useRouter()
	const { t } = useTranslate()

	return (
		<ProtectedLayout
			title={t('page.courses.title', 'Courses')}
			subTitle={t('page.courses.subTitle', 'Invest your time in knowledge')}
			seo={{ openGraph: { type: 'website', url: router.asPath } }}
		>
			<div className={styles.container}>
				<div className="project-vacancies" style={{ marginTop: 32 }}>
					<CoursesList location="hub" />
				</div>
			</div>
		</ProtectedLayout>
	)
}

export default CoursesPage
