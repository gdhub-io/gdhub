import React from 'react'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { PublicLayout } from '@/layouts/PublicLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { FaBook } from '@react-icons/all-files/fa/FaBook'
import { FaCode } from '@react-icons/all-files/fa/FaCode'
import { FaGamepad } from '@react-icons/all-files/fa/FaGamepad'
import { FaPaintBrush } from '@react-icons/all-files/fa/FaPaintBrush'
import { useQuery } from '@tanstack/react-query'
import { useTranslate } from '@tolgee/react'
import { Typography, Button, Space, Tag } from 'antd'
import { theme } from 'antd'
import axios from 'axios'
import Image from 'next/image'
import { useRouter } from 'next/router'
import styles from './style.module.scss'

const { Title, Paragraph } = Typography

/**
 * Individual course page component
 *
 * @returns {JSX.Element} Rendered component
 */
const CoursePage: NextPageWithLayout = () => {
	const { t } = useTranslate()
	const router = useRouter()
	const { slug } = router.query
	const { token } = theme.useToken()

	const {
		data: course,
		isLoading,
		isError,
	} = useQuery({
		queryKey: ['course', slug],
		queryFn: () => axios.get(`/api/courses/${slug}`).then((res) => res.data),
		enabled: !!slug,
	})

	if (isLoading) {
		return (
			<ProtectedLayout title={t('course.loading', 'Loading...')} subTitle="">
				<div className={styles.container}>
					<Paragraph>Loading course...</Paragraph>
				</div>
			</ProtectedLayout>
		)
	}

	if (isError || !course) {
		return (
			<ProtectedLayout title={t('course.notFound', 'Course not found')} subTitle="">
				<div className={styles.container}>
					<Paragraph>Course not found</Paragraph>
					<Button onClick={() => router.push('/hub/courses')}>Back to courses</Button>
				</div>
			</ProtectedLayout>
		)
	}

	function getCourseIcon(category: string) {
		switch (category?.toLowerCase()) {
			case 'programming':
			case 'development':
				return <FaCode size={24} />
			case 'game design':
			case 'design':
				return <FaGamepad size={24} />
			case 'art':
			case 'graphics':
				return <FaPaintBrush size={24} />
			case 'general':
			default:
				return <FaBook size={24} />
		}
	}

	return (
		<PublicLayout title={course.title} subTitle={course.shortDescription || ''}>
			<div className={styles.container}>
				<div className={styles.courseHeader}>
					<div className={styles.courseImage}>
						{course.image && (
							<Image
								src={course.image}
								alt={course.title}
								fill
								style={{ objectFit: 'cover' }}
								sizes="(max-width: 800px) 100vw, 50vw"
							/>
						)}
					</div>
					<div className={styles.courseInfo}>
						<div className={styles.courseMeta}>
							<Space>
								<Tag icon={getCourseIcon(course.category)}>{course.category || 'Course'}</Tag>
								{course.duration && <Tag>{course.duration}</Tag>}
								{course.isFree !== undefined && (
									<Tag color={course.isFree ? 'green' : 'red'}>
										{course.isFree ? t('course.type.free', 'Free') : t('course.type.paid', 'Paid')}
									</Tag>
								)}
							</Space>
						</div>
						<Title level={1}>{course.title}</Title>
						{course.description && <Paragraph className={styles.courseDescription}>{course.description}</Paragraph>}
						<Space>
							<Button type="primary" size="large">
								{t('course.enroll', 'Enroll in course')}
							</Button>
							<Button onClick={() => router.push('/hub/courses')}>
								{t('course.backToCourses', 'Back to courses')}
							</Button>
						</Space>
					</div>
				</div>
			</div>
		</PublicLayout>
	)
}

export default CoursePage
