import { useState } from 'react'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { IconCurrencyEuro } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslate } from '@tolgee/react'
import { Button, Col, Flex, Row, Space, Spin, Typography } from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'
import styles from './style.module.scss'

const { Title, Text } = Typography

const CoursePreviewModal = ({ courseId, open, onOk, onCancel }: any) => {
	return <div>CoursePreviewModal</div>
}

const CoursesList = ({ location }: { location?: 'hub' }) => {
	const { t } = useTranslate()
	const [selectedCourseId, setSelectedCourseId] = useState<string>()

	const {
		data: courses,
		isFetched,
		isLoading,
	} = useQuery({
		queryKey: ['courses'],
		queryFn: () =>
			axios.get<
				(prismaClient.Course & {
					direction: prismaClient.WorkDirection
					groups: (prismaClient.CourseGroup & {
						curriculum: prismaClient.CourseCurriculum
						schedule: prismaClient.CourseGroupSchedule[]
					})[]
				})[]
			>('/api/courses'),
		refetchOnWindowFocus: false,
		refetchInterval: 60000,
	})

	if (isLoading) {
		return (
			<div className={styles.loadingContainer}>
				<Spin />
			</div>
		)
	}

	return (
		<>
			{!!courses?.data && isFetched ? (
				<Row gutter={[16, 16]} wrap>
					{courses.data.map((course, idx) => {
						return (
							<Col span={24} md={12} lg={6} key={`job-${idx}`}>
								<div className={styles.card}>
									<div
										className={[
											styles.cardContent,
											'bg-direc-' + course.direction?.name.replace(' & ', '-').replace(' ', '-'),
										].join(' ')}
									>
										<div className={styles.cardDate}>
											{t('courses.list.validUntil', 'Starts at')}{' '}
											{dayjs(course.groups[0].schedule[0].date).format('ll')}
										</div>
									</div>

									<div className={styles.cardTitle}>
										<Space direction="vertical" size={0}>
											<Text ellipsis>{course.direction?.name}</Text>
											<Title ellipsis={{ rows: 2 }} level={2} style={{ margin: 0, height: '60.8px' }}>
												{course.name}
											</Title>
										</Space>
									</div>

									<div className={styles.cardFooter}>
										<div className={styles.footerContent}>
											{!!course.groups[0].curriculum?.price ? (
												<Flex align="center" gap={4}>
													<Text strong>Price:</Text>
													<Text strong>{course.groups[0].curriculum?.price}</Text>
													<IconCurrencyEuro size={16} />
												</Flex>
											) : (
												<Text>Free</Text>
											)}
											<Text>terms of learning</Text>
										</div>

										<Button
											type="primary"
											href={!location ? `/course/${course.id}` : undefined}
											onClick={
												location === 'hub'
													? () => {
															setSelectedCourseId(course.id)
														}
													: undefined
											}
											className="black-btn"
										>
											{t('course-card.details-button', 'Details')}
										</Button>
									</div>
								</div>
							</Col>
						)
					})}
				</Row>
			) : (
				<p>{t('courses.list.noOpenCourses', 'There are no open courses at the moment')}</p>
			)}

			{location && (
				<CoursePreviewModal
					courseId={selectedCourseId}
					open={!!selectedCourseId}
					onCancel={() => setSelectedCourseId(undefined)}
					onOk={() => setSelectedCourseId(undefined)}
				/>
			)}
		</>
	)
}

export default CoursesList
