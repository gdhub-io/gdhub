'use client'

import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { useQuery } from '@tanstack/react-query'
import { useTranslate } from '@tolgee/react'
import { Typography } from 'antd'
import axios from 'axios'
import { useSession } from 'next-auth/react'
import styles from './style.module.scss'

const { Paragraph } = Typography

/**
 * Projects page component that displays a list of indie game projects
 *
 * @returns {JSX.Element} Rendered component
 */
const CoursesPage: NextPageWithLayout = () => {
	const { t } = useTranslate()
	const { data: session } = useSession()

	const {
		data: courses,
		isSuccess,
		isLoading,
	} = useQuery({ queryKey: ['courses'], queryFn: () => axios.get('/api/courses'), enabled: !!session?.user })

	return (
		<ProtectedLayout
			title={t('page.hab.courses.title', 'Courses')}
			subTitle={t('page.hab.courses.subtitle', 'Game development courses')}
		>
			<div className={styles.container}>
				{!isSuccess && !isLoading && <Paragraph type="secondary">There are no courses available to view</Paragraph>}
				<>soon</>
			</div>
		</ProtectedLayout>
	)
}

export default CoursesPage
