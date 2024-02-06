import { useMemo } from 'react'
import { ProjectReport } from '@prisma/client'
import { useQuery } from '@tanstack/react-query'
import { Grid, Space, Timeline, Typography } from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'
import ReactMarkdown from 'react-markdown'
import YouTube from 'react-youtube'
import rehypeRaw from 'rehype-raw'
import styles from './style.module.scss'

const { Text, Title } = Typography

interface ProjectReportsArgs {
	projectId: string
	projectStartedAt: Date | string
}

type ProjectReportItem =
	| { label?: JSX.Element | string; children: JSX.Element | string; dot?: JSX.Element | string }[]
	| undefined

const ProjectReports = ({ projectId, projectStartedAt }: ProjectReportsArgs) => {
	const screens = Grid.useBreakpoint()
	const { data: projectReports } = useQuery(
		['project-reports', projectId],
		() => axios.get<ProjectReport[]>('/api/project/reports', { params: { projectId } }),
		{
			enabled: !!projectId,
			refetchOnWindowFocus: false,
		}
	)

	const items: ProjectReportItem = useMemo(() => {
		let reportsWithPeriods: ProjectReportItem = []
		let reports = projectReports?.data.map((report: ProjectReport) => {
			return {
				label: dayjs(report.publishedAt).format('D MMM YYYY'),
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

		for (let index = 0; index < reports.length; index++) {
			const currentReport = projectReports.data[index]
			const nextReport = projectReports.data[index + 1]
			const currentDate = dayjs(currentReport.publishedAt).startOf('day')
			const dateAfter = !!nextReport
				? dayjs(nextReport.publishedAt).startOf('day')
				: dayjs(projectStartedAt).startOf('day')
			const period = {
				dot: <span className={styles.periodDot}>{`${currentDate.diff(dateAfter, 'days')} дней`}</span>,
				children: <div style={{ height: 42 }} />,
			}

			reportsWithPeriods.push(reports[index])
			reportsWithPeriods.push(period)
		}

		reportsWithPeriods.push({
			label: dayjs(projectStartedAt).format('D MMM YYYY'),
			children: 'Старт проекта',
		})

		return reportsWithPeriods
	}, [projectReports])

	return (
		<div className={styles.component}>
			<Space direction="vertical" style={{ marginTop: 60, width: '100%' }}>
				<Title level={2}>Журнал разработки</Title>

				{screens.lg && (
					<div className={styles.reportsContainer}>
						<Timeline mode="left" items={items} style={{ margin: '16px 0' }} />
					</div>
				)}

				{!screens.lg && (
					<Space direction="vertical" size={24} className={styles.reportsContainer}>
						{items
							.filter((item) => !item.dot)
							.map((item, idx) => (
								<Space key={idx} direction="vertical" size={4}>
									<Text type="secondary">{item.label}</Text>
									<Text>{item.children}</Text>
								</Space>
							))}
					</Space>
				)}
			</Space>
		</div>
	)
}

export default ProjectReports
