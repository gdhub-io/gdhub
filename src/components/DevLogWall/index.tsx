import { useMemo, useState } from 'react'
import { ProjectReport } from '@prisma/client'
import { useQuery } from '@tanstack/react-query'
import { useTolgee } from '@tolgee/react'
import { Card, Col, List, Row, Typography } from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'
import { useRouter } from 'next/router'
import ReactMarkdown from 'react-markdown'
import YouTube from 'react-youtube'
import rehypeRaw from 'rehype-raw'
import { PostForm } from './PostForm'
import styles from './style.module.scss'

type ProjectReportItem =
	| { label?: JSX.Element | string; children: JSX.Element | string; dot?: JSX.Element | string }[]
	| undefined

const { Title, Paragraph, Text } = Typography

export const DevLogWall = ({ project }: any) => {
	const router = useRouter()
	const { t } = useTolgee()
	const slug = router.query.slug as string
	const [posts, setPosts] = useState<any[]>()

	const {
		data: projectReports,
		isLoading: isLoading,
		refetch,
	} = useQuery(['project-reports', slug], () => axios.get<any[]>('/api/user/project/reports', { params: { slug } }), {
		enabled: !!slug,
		refetchInterval: 60000 * 5,
		refetchOnWindowFocus: false,
	})

	const items: ProjectReportItem = useMemo(() => {
		let reports = projectReports?.data.map((report: ProjectReport) => {
			return {
				label: dayjs(report.publishedAt).format('ll'),
				children: (
					<div className={styles.reportItem}>
						<Text>
							<ReactMarkdown rehypePlugins={[rehypeRaw as any]}>{report.content}</ReactMarkdown>
						</Text>
						{!!report.video && <YouTube className={styles.reportVideo} videoId={report.video} />}
					</div>
				),
			}
		})

		if (!reports?.length || !projectReports) return []

		setPosts(reports)

		return reports
	}, [projectReports])

	if (!project) return null

	return (
		<Row gutter={[32, 16]} className={styles.wall}>
			<Col xs={24} lg={16}>
				<List
					header={<PostForm projectId={project.id} onCreate={() => refetch()} />}
					bordered={false}
					dataSource={items}
					renderItem={(item) => (
						<List.Item>
							<Card style={{ width: '100%' }} className={styles.postCard}>
								<Text type="secondary">{item.label}</Text>
								<br />
								<Paragraph ellipsis={{ rows: 20, expandable: true }}>{item.children}</Paragraph>
							</Card>
						</List.Item>
					)}
				/>
			</Col>
			<Col xs={24} lg={8}>
				<Title level={2}>{projectReports?.data[0]?.project?.name}</Title>
				<Paragraph>{projectReports?.data[0]?.project?.description}</Paragraph>
			</Col>
		</Row>
	)
}
