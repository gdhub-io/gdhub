/* eslint-disable @next/next/no-img-element */
import { getCleanTextContent } from '@/helpers/content'
import { useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Avatar, Button, Card, Col, Grid, Row, Skeleton, Space, Typography } from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import styles from './style.module.scss'
import { DevlogPost } from './types'

const { Title, Text, Paragraph } = Typography
const { useBreakpoint } = Grid

// Функция для получения изображения из контента
const getImageFromContent = (content: string): string | null => {
	// Ищем markdown изображения
	const markdownImages = content.match(/!\[.*?\]\((.*?)\)/g) || []
	// Ищем HTML изображения
	const htmlImages = content.match(/<img[^>]+src="([^">]+)"[^>]*>/g) || []
	const allImages = [...markdownImages, ...htmlImages]

	if (allImages.length > 0) {
		// Пробуем найти URL в markdown формате
		const markdownMatch = allImages[0].match(/\((.*?)\)/)
		if (markdownMatch) return markdownMatch[1]

		// Пробуем найти URL в HTML формате
		const htmlMatch = allImages[0].match(/src="([^">]+)"/)
		if (htmlMatch) return htmlMatch[1]
	}

	return null
}

// Функция для получения инициалов
const getInitials = (title: string): string => {
	if (!title) return ''
	return title
		.split(' ')
		.map((word) => word[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)
}

export const LandingRecentDevlogsSection = () => {
	const screens = useBreakpoint()
	const { t } = useTolgee()

	// Use mock data
	// const isLoading = false
	// const recentDevlogs = { data: mockDevlogs }

	// Use real data
	const { data: recentDevlogs, isLoading } = useQuery({
		queryKey: ['recent-devlogs'],
		queryFn: () => axios.get('/api/landing/project-reports'),
	})

	return (
		<div className={styles.section} id="recent-devlogs">
			<div className={styles.container}>
				<div className={styles.preTitle}>{t('landing.devlogs.pretitle', 'Active Development')}</div>
				<Title level={2}>{t('landing.devlogs.title', 'Recent Devlogs')}</Title>
				<Paragraph className={styles.description}>
					{t(
						'landing.devlogs.description',
						'Follow the progress of game development on our platform. Developers regularly share updates about their projects.'
					)}
				</Paragraph>

				<div className={styles.devlogsContainer}>
					{isLoading ? (
						<Row gutter={[24, 24]}>
							{[1, 2, 3].map((index: number) => (
								<Col key={index} xs={24} sm={12} md={8}>
									<Card className={styles.devlogCard}>
										<Skeleton.Image active style={{ width: '100%', height: 200 }} />
										<Skeleton active paragraph={{ rows: 4 }} />
									</Card>
								</Col>
							))}
						</Row>
					) : (
						<Row gutter={[24, 24]}>
							{recentDevlogs?.data?.map((devlog: DevlogPost) => {
								const imageUrl = devlog.pageCover || getImageFromContent(devlog.content)
								const initials = getInitials(devlog.project?.name || '')

								return (
									<Col key={devlog.id} xs={24} sm={12} md={8}>
										<Link href={`/devlog/${devlog.id}`}>
											<Card className={styles.devlogCard}>
												{imageUrl ? (
													<div className={styles.cardImage}>
														<img src={imageUrl} alt={devlog.project?.name} className={styles.image} />
													</div>
												) : (
													<div className={styles.defaultCover}>
														<div className={styles.defaultCoverContent}>
															<span className={styles.defaultCoverInitials}>{initials}</span>
														</div>
													</div>
												)}
												<div className={styles.cardHeader}>
													<Space direction="vertical" size={4} className={styles.projectInfo}>
														<Text strong>{devlog.project?.name}</Text>
														<Text type="secondary">{dayjs(devlog.createdAt).format('MMMM D, YYYY')}</Text>
													</Space>
												</div>
												<div className={styles.cardContent}>
													<Text>{getCleanTextContent(devlog.content, 100)}</Text>
												</div>
											</Card>
										</Link>
									</Col>
								)
							})}
						</Row>
					)}
				</div>
			</div>
		</div>
	)
}
