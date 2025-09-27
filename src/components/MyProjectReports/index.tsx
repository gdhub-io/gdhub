import { useState } from 'react'
import ProjectReportModal from '@/components/modals/ProjectReportModal'
import { TbTrash } from '@react-icons/all-files/tb/TbTrash'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslate } from '@tolgee/react'
import { Button, Grid, Popconfirm, Space, Table, message } from 'antd'
import { ColumnsType } from 'antd/es/table'
import axios from 'axios'
import dayjs from 'dayjs'

interface MyProjectReportsArgs {
	project: any
}

const MyProjectReports = ({ project }: MyProjectReportsArgs) => {
	const screens = Grid.useBreakpoint()
	const { t } = useTranslate()
	const [showProjectReportModal, setShowProjectReportModal] = useState(false)
	const [selectedReportId, setSelectedReportId] = useState<string>()

	const {
		data: MyProjectReports,
		refetch: fetchMyProjectReports,
		isLoading: isLoadingMyProjectReports,
	} = useQuery({
		queryKey: ['project-reports', project?.id],
		queryFn: () => axios.get('/api/user/project/reports', { params: { projectId: project?.id } }),
		enabled: !!project,
	})
	const { mutateAsync: deleteProjectReport } = useMutation({
		mutationFn: (params: { id: string }) => axios.delete<void>('/api/user/project/report', { params }),
	})

	const columns: ColumnsType<any> = [
		{
			title: t('components.my-project-reports.report', 'Report'),
			dataIndex: 'ID',
			key: 'ID',
			width: '100%',
			render: (value, record) =>
				t('components.my-project-reports.report-from', 'Report from') + ' ' + dayjs(record.publishedAt).format('lll'),
		},
		{
			key: 'actions',
			responsive: ['md'],
			render: (value, record) => (
				<Space>
					<Button onClick={() => handleEditReport(record.id)}>
						{t('components.my-project-reports.change', 'Change')}
					</Button>
					<Popconfirm
						key={record.id}
						title={t('You definitely want to delete this report?')}
						okText={t('components.my-project-reports.yes', 'Yes')}
						cancelText={t('components.my-project-reports.no', 'No')}
						onConfirm={() => handleDeleteReport(record.id)}
					>
						<Button icon={<TbTrash />} type="text" danger style={{ lineHeight: 'initial' }} />
					</Popconfirm>
				</Space>
			),
		},
	]

	const handleEditReport = (id: string) => {
		setSelectedReportId(id)
		setShowProjectReportModal(true)
	}

	const handleDeleteReport = async (id: string) => {
		await deleteProjectReport({ id })

		message.success(t('components.my-project-reports.report-deleted', 'Report was deleted'))

		await fetchMyProjectReports()
	}

	const handleSaveReport = () => {
		setShowProjectReportModal(false)
		fetchMyProjectReports()
	}

	const handleAddReport = () => {
		setSelectedReportId(undefined)
		setShowProjectReportModal(true)
	}

	return (
		<>
			<Space align="center" style={{ marginTop: 60 }}>
				<h3 style={{ margin: 0 }}>{t('components.my-project-reports.reports', 'Reports')}</h3>
				<Button onClick={() => handleAddReport()}>
					{t('components.my-project-reports.add-report', 'Add a report')}
				</Button>
			</Space>

			{MyProjectReports?.data.length > 0 ? (
				<>
					<Table
						loading={isLoadingMyProjectReports}
						style={{ border: '1px solid #aaa', overflow: 'hidden', borderRadius: 16, marginTop: 16 }}
						columns={columns}
						dataSource={MyProjectReports?.data?.map((m: any) => ({ ...m, key: m.id }))}
						pagination={false}
					/>
				</>
			) : (
				<p style={{ marginTop: 12, color: 'gray' }}>
					{t(
						'components.my-project-reports.at-the-moment-reports-are-not-provided',
						'At the moment, reports are not provided'
					)}
				</p>
			)}

			<ProjectReportModal
				projectId={project.id}
				reportId={selectedReportId}
				open={showProjectReportModal}
				onCancel={() => {
					setShowProjectReportModal(false)
					setSelectedReportId(undefined)
				}}
				onOk={handleSaveReport}
			/>
		</>
	)
}

export default MyProjectReports
