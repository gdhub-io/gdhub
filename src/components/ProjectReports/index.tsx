import { useMemo } from 'react'
import { fetcher } from '@helpers/fetcher'
import { Grid, Space, Timeline, Typography } from 'antd'
import moment from 'moment'
import ReactMarkdown from 'react-markdown'
import YouTube from 'react-youtube'
import useSWR from 'swr'
import styles from './style.module.scss'
import dayjs from 'dayjs'

const { Text } = Typography

interface ProjectReportsArgs {
	project: any
}

const ProjectReports = ({ project }: ProjectReportsArgs) => {
	const screen = Grid.useBreakpoint()
	const {
		data: projectReports,
		mutate: fetchMyProjectReports,
		isValidating: isLoadingMyProjectReports,
	} = useSWR(
		{
			url: '/api/project-report/list',
			data: { projectId: project?.id },
		},
		fetcher,
		{
			revalidateOnFocus: false,
			isPaused: () => !project,
		}
	)

	const items = useMemo(() => {
		let reports: any[] = projectReports?.data.map((report: any) => {
			return {
				label: moment(report.Date).format('D MMM YYYY'),
				children: (
					<div className={styles.reportItem}>
						<Text>
							<ReactMarkdown>{report.Content}</ReactMarkdown>
						</Text>
						{!!report['Youtube Video ID'] && (
							<YouTube className={styles.reportVideo} videoId={report['Youtube Video ID']} />
						)}
					</div>
				),
			}
		})

		let reportsWithPeriods = []
		for (let index = 0; index < reports?.length; index++) {
			const currentReport = projectReports.data[index]
			const nextReport = projectReports.data[index + 1]
			const currentDate = dayjs(currentReport.Date).startOf('day')
			const dateAfter = !!nextReport ? dayjs(nextReport.Date).startOf('day') : dayjs(project.Created).startOf('day')
			const period = {
				dot: <span className={styles.periodDot}>{`${currentDate.diff(dateAfter, 'days')} дней`}</span>,
				children: <div style={{ height: 42 }} />,
			}

			console.log('diff', currentDate.toString(), dateAfter.toString())

			reportsWithPeriods.push(reports[index])
			reportsWithPeriods.push(period)
		}

		reports = reportsWithPeriods
		reports.push({
			label: dayjs(project.Created).format('D MMM YYYY'),
			children: 'Старт проекта',
		})

		return reports
	}, [projectReports])

	return (
		<div className={styles.component}>
			<Space direction="vertical" style={{ marginTop: 60 }}>
				<h3>Журнал разработки</h3>
			</Space>

			<div className={styles.reportsContainer}>
				<Timeline mode="left" items={items} style={{ margin: '16px 0' }} />
			</div>
		</div>
	)
}

export default ProjectReports
