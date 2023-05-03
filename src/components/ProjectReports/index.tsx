import { useState } from 'react'
import VacancyPreviewModal from '@components/modals/VacancyPreviewModal'
import { fetcher } from '@helpers/fetcher'
import { Button, Space, Table, Tag, Timeline } from 'antd'
import { ColumnsType } from 'antd/lib/table'
import moment from 'moment'
import useSWR from 'swr'

interface ProjectReportsArgs {
	project: any
}

const ProjectReports = ({ project }: ProjectReportsArgs) => {
	const [showVacancyPreviewModal, setShowVacancyPreviewModal] = useState(false)
	const [selectedVacancyId, setSelectedVacancyId] = useState<string>()
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

	const items = projectReports?.data.map((report: any) => {
		return {
			children: '123',
		}
	})

	return (
		<>
			<Space direction="vertical" style={{ marginTop: 60 }}>
				<h3 style={{ margin: 0 }}>Журнал разработки</h3>
			</Space>

			{projectReports?.data.length > 0 ? (
				<div>
					<Timeline mode="left">
						{projectReports?.data.map((report: any) => (
							<Timeline.Item label={moment(report.Date).format('D MMM YYYY')} key={report.ID}>
								{report.Content}
							</Timeline.Item>
						))}
					</Timeline>
				</div>
			) : (
				<p>Проект стартовал {moment(project.Created).format('DD.MM.YYYY')}</p>
			)}
		</>
	)
}

export default ProjectReports
