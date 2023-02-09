import { useState } from 'react'
import ProjectCandidatePreviewModal from '@components/modals/ProjectCandidatePreviewModal'
import { fetcher } from '@helpers/fetcher'
import { Avatar, Grid, Space, Table, Tag } from 'antd'
import { ColumnsType } from 'antd/lib/table'
import moment from 'moment'
import useSWR from 'swr'

interface Vacancy {
	key: string
	Name: string
	Description: string
	FinishedAt: string
	Status: string
	[key: string]: any
}

const vacancyStatusToText = (status: string) => {
	switch (status) {
		case 'Draft':
			return 'Черновик'
		case 'Opened':
			return 'Размещена'
		case 'Closed':
			return 'Закрыта'
	}
}

interface MyProjectCandidatesArgs {
	project: any
	onUpdate: () => void
}

const MyProjectCandidates = ({ project, onUpdate = () => {} }: MyProjectCandidatesArgs) => {
	const screens = Grid.useBreakpoint()
	const [showCandidatePreviewModal, setShowCandidatePreviewModal] = useState(false)
	const [selectedCandidateId, setSelectedCandidateId] = useState<string>()
	const {
		data: MyProjectCandidates,
		mutate: fetchMyProjectCandidates,
		isValidating: isLoadingMyMyProjectCandidates,
	} = useSWR(
		{ url: '/api/my/project-candidates', data: { projectId: project?.id, projectName: project?.Name } },
		fetcher,
		{
			revalidateOnFocus: false,
			isPaused: () => !project,
		}
	)

	const columns: ColumnsType<Vacancy> = [
		{
			title: 'Кандидат',
			dataIndex: 'Name',
			key: 'Name',
			// width: '60%',
			render: (value, record) => (
				<>
					<div style={{ cursor: 'pointer', fontWeight: 'bold' }} onClick={() => handleShowCandidate(record.id)}>
						<Space>
							<Avatar shape="square" size={32} src={record.Avatar || null} />
							{value}
						</Space>
					</div>
					<small>{record['Speciality Name']}</small>
				</>
			),
		},
		{
			title: 'Вакансия',
			dataIndex: 'Vacancy Name',
			responsive: ['md'],
			key: 'Vacancy Name',
		},
		{
			title: 'Получено',
			dataIndex: 'Created At',
			responsive: ['md'],
			key: 'Created At',
			render: (value) => moment(value).format('DD.MM.YYYY'),
		},
		{
			key: 'actions',
			responsive: ['md'],
		},
	]

	const handleShowCandidate = (id: string) => {
		setSelectedCandidateId(id)
		setShowCandidatePreviewModal(true)
	}

	const handleApproveCandidate = () => {
		setShowCandidatePreviewModal(false)
		fetchMyProjectCandidates()
		onUpdate()
	}

	return (
		<>
			<Space align="center" style={{ marginTop: 60 }}>
				<h3 style={{ margin: 0 }}>Отклики на вакансии</h3>
				<Tag color="gray">{MyProjectCandidates?.total || 0}</Tag>
			</Space>

			{MyProjectCandidates?.data.length > 0 ? (
				<>
					<Table
						loading={isLoadingMyMyProjectCandidates}
						style={{ border: '1px solid #aaa', overflow: 'hidden', borderRadius: 16, marginTop: 16 }}
						columns={columns}
						dataSource={MyProjectCandidates?.data?.map((m: any) => ({ ...m, key: m.id }))}
						pagination={false}
					/>

					<ProjectCandidatePreviewModal
						project={project}
						candidateId={selectedCandidateId}
						open={showCandidatePreviewModal}
						onCancel={() => {
							setShowCandidatePreviewModal(false)
							setSelectedCandidateId(undefined)
						}}
						onOk={handleApproveCandidate}
					/>
				</>
			) : (
				<p style={{ marginTop: 12, color: 'gray' }}>На данный момент заявок на участие нет</p>
			)}
		</>
	)
}

export default MyProjectCandidates
