/* eslint-disable @next/next/no-img-element */
import { useMemo } from 'react'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { useQuery } from '@tanstack/react-query'
import { T } from '@tolgee/react'
import { Avatar, Flex, List, Space, Typography } from 'antd'
import axios from 'axios'
import { useRouter } from 'next/router'
import ReactMarkdown from 'react-markdown'
import ReactPlayer from 'react-player'
import rehypeRaw from 'rehype-raw'
import styles from './style.module.scss'
import { DevLogPost } from '../DevLogWall/DevLogPost'

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

export const DevLogPublicWall = ({ projectId }: any) => {
	const router = useRouter()

	const { data: projectReports } = useQuery(
		['project-reports', projectId],
		() =>
			axios.get<(prismaClient.ProjectReport & { author: Record<string, any> })[]>('/api/project/reports', {
				params: { projectId },
			}),
		{
			enabled: !!projectId,
			refetchOnWindowFocus: false,
		}
	)

	// const items: ProjectReportItem = useMemo(() => {
	// 	let reports = projectReports?.data.map((report: prismaClient.ProjectReport) => {
	// 		return {
	// 			label: dayjs(report.publishedAt).format('ll'),
	// 			children: (
	// 				<div className={styles.reportItem}>
	// 					<Text>
	// 						<ReactMarkdown rehypePlugins={[rehypeRaw as any]}>{report.content}</ReactMarkdown>
	// 					</Text>
	// 					{!!report.video && <YouTube className={styles.reportVideo} videoId={report.video} />}
	// 				</div>
	// 			),
	// 		}
	// 	})

	// 	if (!reports?.length || !projectReports) return []

	// 	setPosts(reports)

	// 	return reports
	// }, [projectReports])

	const items: ProjectReportItem = useMemo(() => {
		let reports = projectReports?.data.map((report: prismaClient.ProjectReport & { author: Record<string, any> }) => {
			return {
				id: report.id,
				authorId: report.authorId,
				label: (
					<Flex gap={16}>
						<Avatar src={report.author.image} size={48} />
						<Space direction="vertical" size={0}>
							<Text>{report.author.profile.name || report.author.name}</Text>
							<Text type="secondary">{report.author.memberInTeams[0]?.position}</Text>
						</Space>
					</Flex>
				),
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

	if (!projectId || !projectReports?.data || !items?.length) return null

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
						<DevLogPost data={item} editable={false} />
					</List.Item>
				)}
			/>
		</>
	)
}
