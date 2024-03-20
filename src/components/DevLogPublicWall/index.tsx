import { useMemo, useState } from 'react'
import { ProjectReport } from '@prisma/client'
import { useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Card, List, Typography } from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'
import { useRouter } from 'next/router'
import ReactMarkdown from 'react-markdown'
import YouTube from 'react-youtube'
import rehypeRaw from 'rehype-raw'
import styles from './style.module.scss'

type ProjectReportItem =
	| { label?: JSX.Element | string; children: JSX.Element | string; dot?: JSX.Element | string }[]
	| undefined

const { Title, Paragraph, Text } = Typography

export const DevLogPublicWall = ({ projectId }: any) => {
	const router = useRouter()
	const { t } = useTolgee()
	const slug = router.query.slug as string
	const [posts, setPosts] = useState<any[]>()

	const { data: projectReports } = useQuery(
		['project-reports', projectId],
		() => axios.get<ProjectReport[]>('/api/project/reports', { params: { projectId } }),
		{
			enabled: !!projectId,
			refetchOnWindowFocus: false,
		}
	)

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

	if (!projectId || !projectReports?.data) return null

	return (
		<>
			<Title level={2}>
				<T>Last updates</T>
			</Title>

			<List
				bordered={false}
				dataSource={items}
				renderItem={(item) => (
					<List.Item>
						<Card style={{ width: '100%' }}>
							<Text type="secondary">{item.label}</Text>
							<br />
							<Paragraph ellipsis={{ rows: 20, expandable: true }}>{item.children}</Paragraph>
						</Card>
					</List.Item>
				)}
			/>
		</>
	)
}
