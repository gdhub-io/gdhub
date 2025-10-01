'use client'

import React from 'react'
import { CourseCard, CourseSection } from '@/components/courses'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { useQuery } from '@tanstack/react-query'
import { useTranslate } from '@tolgee/react'
import { Typography, Button } from 'antd'
import { theme } from 'antd'
import axios from 'axios'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import styles from './style.module.scss'

const { Paragraph } = Typography

/**
 * My courses page component that displays user's courses
 *
 * @returns {JSX.Element} Rendered component
 */
const MyCoursesPage: NextPageWithLayout = () => {
	const { t } = useTranslate()
	const { data: session } = useSession()
	const { token } = theme.useToken()
	const router = useRouter()

	const {
		data: myCourses,
		isSuccess,
		isLoading,
	} = useQuery({
		queryKey: ['my-courses'],
		queryFn: () => axios.get('/api/user/courses').then((res) => res.data),
		enabled: !!session?.user,
	})

	return (
		<ProtectedLayout
			title={t('courses.myCourses', 'My courses')}
			subTitle={t('courses.myCoursesDescription', 'Courses where you are an author, student, or instructor')}
			extra={<Button>{t('courses.createCourse', 'Create course')}</Button>}
			showBackButton
			backButtonUrl="/hub/courses"
		>
			<div className={styles.container}>
				<CourseSection
					CardComponent={CourseCard}
					token={token}
					queryKey={['my-courses']}
					queryFn={() => axios.get('/api/user/courses').then((res) => res.data)}
				/>

				{!isSuccess && !isLoading && (
					<Paragraph type="secondary">{t('courses.noMyCourses', 'You are not enrolled in any courses yet')}</Paragraph>
				)}
			</div>
		</ProtectedLayout>
	)
}

export default MyCoursesPage
