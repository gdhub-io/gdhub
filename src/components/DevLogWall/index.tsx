/* eslint-disable @next/next/no-img-element */
import { useMemo, useState } from 'react'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { useQuery } from '@tanstack/react-query'
import { Col, List, Row, Spin, Typography } from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import ReactMarkdown from 'react-markdown'
import ReactPlayer from 'react-player/lazy'
import rehypeRaw from 'rehype-raw'
import { DevLogPost } from './DevLogPost'
import { PostForm } from './PostForm'
import styles from './style.module.scss'
import EditPostModal from '../modals/EditPostModal'

type ProjectReportItem =
	| {
			id: string
			label?: JSX.Element | string
			authorId: string
			children: JSX.Element | string
			dot?: JSX.Element | string
	  }[]
	| undefined

const { Title, Paragraph, Text } = Typography

export const DevLogWall = () => {
	const router = useRouter()
	const slug = router.query.slug as string
	const [editablePostId, setEditablePostId] = useState<string>()
	const { data: session } = useSession()

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
		let reports = projectReports?.data.map((report: prismaClient.ProjectReport) => {
			return {
				id: report.id,
				authorId: report.authorId,
				label: dayjs(report.publishedAt).format('ll'),
				children: (
					<div className={styles.reportItem}>
						<Paragraph ellipsis={{ rows: 20, expandable: true }}>
							<ReactMarkdown
								rehypePlugins={[rehypeRaw as any]}
								components={{
									img: (props) => <img style={{ maxWidth: '100%' }} alt={props.alt || ''} {...props} />,
								}}
							>
								{report.content}
							</ReactMarkdown>
						</Paragraph>
						{!!report.video && (
							<div className={styles.playerWrapper}>
								<ReactPlayer url={report.video} light width="100%" height="100%" />
							</div>
						)}
					</div>
				),
			}
		})

		if (!reports?.length || !projectReports) return []

		return reports
	}, [projectReports])

	if (!projectReports?.data?.length) return null

	return (
		<>
			<Spin spinning={isLoading}>
				<Row gutter={[32, 16]} className={styles.wall}>
					<Col xs={24} lg={16}>
						<List
							header={<PostForm projectId={projectReports.data[0].projectId} onCreate={() => refetch()} />}
							bordered={false}
							dataSource={items}
							renderItem={(item) => (
								<List.Item>
									<DevLogPost data={item} onUpdate={setEditablePostId} editable={session?.user.id == item.authorId} />
								</List.Item>
							)}
						/>
					</Col>
					<Col xs={24} lg={8}>
						<Title level={2}>{projectReports.data[0].project?.name}</Title>
						<Paragraph>{projectReports.data[0].project?.description}</Paragraph>
					</Col>
				</Row>
			</Spin>

			<EditPostModal
				open={!!editablePostId}
				postId={editablePostId}
				onUpdate={() => {
					refetch()
					setEditablePostId(undefined)
				}}
				onCancel={() => setEditablePostId(undefined)}
			/>
		</>
	)
}
