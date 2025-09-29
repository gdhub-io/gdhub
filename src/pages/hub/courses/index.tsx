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
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import styles from './style.module.scss'

const { Paragraph } = Typography

/**
 * Courses page component that displays a list of courses
 *
 * @returns {JSX.Element} Rendered component
 */
const CoursesPage: NextPageWithLayout = () => {
	const { t } = useTranslate()
	const { data: session } = useSession()
	const { token } = theme.useToken()
	const router = useRouter()

	const {
		data: courses,
		isSuccess,
		isLoading,
	} = useQuery({
		queryKey: ['courses'],
		queryFn: () => axios.get('/api/courses').then((res) => res.data),
		enabled: !!session?.user,
	})

	const handleMyCoursesClick = () => {
		router.push('/hub/courses/my')
	}

	return (
		<ProtectedLayout
			title={t('page.hab.courses.title', 'Courses')}
			subTitle={t('page.hab.courses.subtitle', 'Game development courses')}
			extra={
				!!session?.user?.id && (
					<Link href="/hub/courses/my">
						<Button type="text">{t('courses.myCourses', 'My courses')}</Button>
					</Link>
				)
			}
		>
			<div className={styles.container}>
				<CourseSection CardComponent={CourseCard} token={token} />

				{!isSuccess && !isLoading && <Paragraph type="secondary">There are no courses available to view</Paragraph>}
			</div>
		</ProtectedLayout>
	)
}

export default CoursesPage
