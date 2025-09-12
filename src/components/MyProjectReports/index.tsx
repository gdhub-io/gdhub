import { useState } from 'react'
import ProjectReportModal from '@/components/modals/ProjectReportModal'
import { TbTrash } from '@react-icons/all-files/tb/TbTrash'
import { useMutation, useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Button, Grid, Popconfirm, Space, Table, message } from 'antd'
import { ColumnsType } from 'antd/es/table'
import axios from 'axios'
import dayjs from 'dayjs'

interface MyProjectReportsArgs {
	project: any
}

const MyProjectReports = ({ project }: MyProjectReportsArgs) => {
	const screens = Grid.useBreakpoint()
	const { t } = useTolgee()
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
			title: <T>Report</T>,
			dataIndex: 'ID',
			key: 'ID',
			width: '100%',
			render: (value, record) => t('Report from') + ' ' + dayjs(record.publishedAt).format('lll'),
		},
		{
			key: 'actions',
			responsive: ['md'],
			render: (value, record) => (
				<Space>
					<Button onClick={() => handleEditReport(record.id)}>
						<T>Change</T>
					</Button>
					<Popconfirm
						key={record.id}
						title={t('You definitely want to delete this report?')}
						okText={<T>Yes</T>}
						cancelText={<T>No</T>}
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

		message.success('Report was deleted')

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
				<h3 style={{ margin: 0 }}>
					<T>Reports</T>
				</h3>
				<Button onClick={() => handleAddReport()}>
					<T>Add a report</T>
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
					<T>At the moment, reports are not provided</T>
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
