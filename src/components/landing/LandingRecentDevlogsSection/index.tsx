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

	// Use mock data
	// const isLoading = false
	// const recentDevlogs = { data: mockDevlogs }

	const truncateContent = (content: string, maxLength = 150) => {
		if (content.length <= maxLength) return content
		return content.substring(0, maxLength) + '...'
	}

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
							{[1, 2, 3].map((item) => (
								<Col xs={24} md={12} lg={8} key={item}>
									<Card className={styles.devlogCard}>
										<Skeleton avatar active paragraph={{ rows: 4 }} />
									</Card>
								</Col>
							))}
						</Row>
					) : (
						<Row gutter={[24, 24]}>
							{recentDevlogs?.data.map((devlog: DevlogPost) => (
								<Col xs={24} md={12} lg={8} key={devlog.id}>
									<Card className={styles.devlogCard} hoverable>
										<Link href={`/project/${devlog.project?.slug}`}>
											<div className={styles.cardHeader}>
												<div className={styles.projectInfo}>
													<Title level={4}>{devlog.project?.name}</Title>
													<Text type="secondary">{dayjs(devlog.publishedAt).format('DD.MM.YYYY')}</Text>
												</div>
											</div>
											<div className={styles.cardContent}>
												<Paragraph ellipsis={{ rows: 3 }}>
													<ReactMarkdown
														rehypePlugins={[rehypeRaw as any]}
														components={{
															img: () => null, // Не показываем изображения в превью
															h1: ({ children }) => <span>{children}</span>,
															h2: ({ children }) => <span>{children}</span>,
															h3: ({ children }) => <span>{children}</span>,
														}}
													>
														{truncateContent(devlog.content)}
													</ReactMarkdown>
												</Paragraph>
											</div>
											<div className={styles.cardFooter}>
												<Space>
													<Avatar src={devlog.author?.image} size="small">
														{devlog.author?.name?.charAt(0)}
													</Avatar>
													<Text type="secondary">{devlog.author?.name}</Text>
												</Space>
											</div>
										</Link>
									</Card>
								</Col>
							))}
						</Row>
					)}
				</div>

				<div className={styles.actionContainer}>
					<Link href="/projects">
						<Button type="primary" size={screens.md ? 'large' : 'middle'} className={styles.actionButton}>
							<T keyName="landing.devlogs.viewAllProjects">Смотреть все проекты</T>
						</Button>
					</Link>
				</div>
			</div>
		</div>
	)
}
