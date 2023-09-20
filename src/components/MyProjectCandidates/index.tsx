import { useState } from 'react'
import ProjectCandidatePreviewModal from '@/components/modals/ProjectCandidatePreviewModal'
import { Project, Speciality, TeamMember, TeamVacancy, User } from '@prisma/client'
import { useQuery } from '@tanstack/react-query'
import { Avatar, Grid, Space, Table, Tag } from 'antd'
import { ColumnsType } from 'antd/lib/table'
import axios from 'axios'
import dayjs from 'dayjs'

interface MyProjectCandidatesArgs {
	project: Project & Record<string, any>
}

const MyProjectCandidates = ({ project }: MyProjectCandidatesArgs) => {
	const screens = Grid.useBreakpoint()
	const [showCandidatePreviewModal, setShowCandidatePreviewModal] = useState(false)
	const [selectedCandidateId, setSelectedCandidateId] = useState<string>()

	const {
		data: candidates,
		refetch: refetchCandidates,
		isFetching: isLoadingCandidates,
	} = useQuery(
		['candidates', project.id],
		() =>
			axios.get<
				(TeamMember & { vacancy: TeamVacancy; speciality: Speciality; user: User & { specialities: Speciality[] } })[]
			>('/api/user/project/candidates', {
				params: { teamId: project?.teamId },
			}),
		{ enabled: !!project }
	)

	const columns: ColumnsType<
		TeamMember & { vacancy: TeamVacancy; speciality: Speciality; user: User & { specialities: Speciality[] } }
	> = [
		{
			title: 'Кандидат',
			dataIndex: 'id',
			key: 'id',
			render: (value, record) => (
				<>
					<div style={{ cursor: 'pointer', fontWeight: 'bold' }} onClick={() => handleShowCandidate(record.id)}>
						<Space>
							<Avatar shape="square" size={32} src={record.user.image || null} />
							{record.user.name}
						</Space>
					</div>
					<small>
						{record.speciality?.name} / {record.speciality.level}
					</small>
				</>
			),
		},
		{
			title: 'Вакансия',
			dataIndex: 'vacancyId',
			responsive: ['md'],
			key: 'vacancyId',
			render: (_, record) => {
				return record.vacancy?.title
			},
		},
		{
			title: 'Получено',
			dataIndex: 'createdAt',
			responsive: ['md'],
			key: 'createdAt',
			render: (value) => dayjs(value).format('LLL'),
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
		refetchCandidates()
	}

	return (
		<>
			<Space align="center" style={{ marginTop: 60 }}>
				<h3 style={{ margin: 0 }}>Отклики на вакансии</h3>
				<Tag color="gray">{candidates?.data.length || 0}</Tag>
			</Space>

			{!!candidates?.data.length ? (
				<>
					<Table
						loading={isLoadingCandidates}
						style={{ border: '1px solid #aaa', overflow: 'hidden', borderRadius: 16, marginTop: 16 }}
						columns={columns}
						dataSource={candidates?.data?.map((m: any) => ({ ...m, key: m.id }))}
						pagination={false}
					/>

					<ProjectCandidatePreviewModal
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
