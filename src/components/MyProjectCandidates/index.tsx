import { useContext, useState } from 'react'
import ProjectCandidatePreviewModal from '@/components/modals/ProjectCandidatePreviewModal'
import { ProjectContext } from '@/contexts/ProjectContext'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Avatar, Grid, Space, Table, Tag } from 'antd'
import { ColumnsType } from 'antd/es/table'
import axios from 'axios'
import dayjs from 'dayjs'

const MyProjectCandidates = () => {
	const screens = Grid.useBreakpoint()
	const contextProject = useContext(ProjectContext)?.contextProject
	const { t } = useTolgee()
	const [showCandidatePreviewModal, setShowCandidatePreviewModal] = useState(false)
	const [selectedCandidateId, setSelectedCandidateId] = useState<string>()

	const {
		data: candidates,
		refetch: refetchCandidates,
		isFetching: isLoadingCandidates,
	} = useQuery(
		['candidates', contextProject?.id],
		() =>
			axios.get<
				(prismaClient.TeamMember & {
					vacancy: prismaClient.TeamVacancy
					speciality: prismaClient.Speciality
					user: prismaClient.User & { specialities: prismaClient.Speciality[] }
				})[]
			>('/api/user/project/candidates', {
				params: { teamId: contextProject?.teamId },
			}),
		{ enabled: !!contextProject }
	)

	const columns: ColumnsType<
		prismaClient.TeamMember & {
			vacancy: prismaClient.TeamVacancy
			speciality: prismaClient.Speciality
			user: prismaClient.User & { specialities: prismaClient.Speciality[] }
		}
	> = [
		{
			title: t('Candidate'),
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
			title: t('Job vacancy'),
			dataIndex: 'vacancyId',
			responsive: ['md'],
			key: 'vacancyId',
			render: (_, record) => {
				return record.vacancy?.title
			},
		},
		{
			title: t('Obtained'),
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
				<h3 style={{ margin: 0 }}>
					<T>Responses on vacancies</T>
				</h3>
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
				<p style={{ marginTop: 12, color: 'gray' }}>
					<T>There are no applications for participation at the moment</T>
				</p>
			)}
		</>
	)
}

export default MyProjectCandidates
