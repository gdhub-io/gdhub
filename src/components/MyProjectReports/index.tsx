import { useState } from 'react'
import ProjectReportModal from '@/components/modals/ProjectReportModal'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button, Grid, Popconfirm, Space, Table, message } from 'antd'
import { ColumnsType } from 'antd/lib/table'
import axios from 'axios'
import dayjs from 'dayjs'
import { TbTrash } from 'react-icons/tb'

interface MyProjectReportsArgs {
	project: any
}

const MyProjectReports = ({ project }: MyProjectReportsArgs) => {
	const screens = Grid.useBreakpoint()
	const [showProjectReportModal, setShowProjectReportModal] = useState(false)
	const [selectedReportId, setSelectedReportId] = useState<string>()

	const {
		data: MyProjectReports,
		refetch: fetchMyProjectReports,
		isLoading: isLoadingMyProjectReports,
	} = useQuery(
		['project-reports', project?.id],
		() => axios.get('/api/user/project/reports', { params: { projectId: project?.id } }),
		{ enabled: !!project }
	)
	const { mutateAsync: deleteProjectReport } = useMutation((params: { id: string }) =>
		axios.delete<void>('/api/user/project/report', { params })
	)

	const columns: ColumnsType<any> = [
		{
			title: 'Отчет',
			dataIndex: 'ID',
			key: 'ID',
			width: '100%',
			render: (value, record) => 'Отчет от ' + dayjs(record.publishedAt).format('lll'),
		},
		{
			key: 'actions',
			responsive: ['md'],
			render: (value, record) => (
				<Space>
					<Button onClick={() => handleEditReport(record.id)}>Изменить</Button>
					<Popconfirm
						key={record.id}
						title="Точно хотите удалить этот отчет?"
						okText="Да"
						cancelText="Нет"
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
				<h3 style={{ margin: 0 }}>Отчеты</h3>
				<Button onClick={() => handleAddReport()}>Добавить отчет</Button>
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
				<p style={{ marginTop: 12, color: 'gray' }}>На данный момент отчетов не предоставлено</p>
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
