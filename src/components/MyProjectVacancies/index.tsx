import { useState } from 'react'
import VacancyModal from '@/components/modals/VacancyModal'
import { Project, TeamVacancyStatus } from '@prisma/client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button, Flex, Grid, message, Popconfirm, Space, Table, Tag } from 'antd'
import { ColumnsType } from 'antd/lib/table'
import axios from 'axios'
import dayjs from 'dayjs'
import { HiOutlineLockClosed } from 'react-icons/hi'
import VacancyArchiveModal from '../modals/VacancyArchiveModal'

interface Vacancy {
	key: string
	Name: string
	Description: string
	FinishedAt: string
	Status: TeamVacancyStatus
	[key: string]: any
}

const vacancyStatusToText = (status: TeamVacancyStatus) => {
	switch (status) {
		case TeamVacancyStatus.Draft:
			return 'Черновик'
		case TeamVacancyStatus.Published:
			return 'Размещена'
		case TeamVacancyStatus.Closed:
			return 'Закрыта'
	}
}

interface MyProjectVacanciesArgs {
	teamId: string
	project: Partial<Project>
}

const MyProjectVacancies = ({ teamId, project }: MyProjectVacanciesArgs) => {
	const screens = Grid.useBreakpoint()
	const [showVacancyModal, setShowVacancyModal] = useState(false)
	const [selectedVacancyId, setSelectedVacancyId] = useState<string>()
	const [showVacancyArchiveModal, setShowVacancyArchiveModal] = useState(false)

	const {
		data: projectVacancies,
		refetch: fetchMyProjectVacancies,
		isLoading: isLoadingMyMyProjectVacancies,
	} = useQuery(
		['project-team-vacancies', teamId],
		() =>
			axios.get('/api/user/project/vacancies', {
				params: { teamId },
			}),
		{
			enabled: !!teamId,
			refetchOnWindowFocus: false,
		}
	)

	const { mutateAsync: cancelVacany } = useMutation((data: { id: string }) =>
		axios.delete<any>('/api/user/project/vacancy', { params: data })
	)

	const vacanciesColumns: ColumnsType<Vacancy> = [
		{
			title: 'Название',
			dataIndex: 'title',
			key: 'title',
			width: '50%',
			render: (value, data) => (
				<>
					<span onClick={() => handleEditVacancy(data.id)}>{value}</span>{' '}
					{data.status == 'Draft' && <Tag color="lime">{vacancyStatusToText(data.status)}</Tag>}
				</>
			),
		},
		{
			title: 'Направление',
			dataIndex: 'direction',
			key: 'direction',
			responsive: ['md'],
		},
		{
			title: 'Действует до',
			dataIndex: 'finishedAt',
			key: 'finishedAt',
			responsive: ['md'],
			render: (value) => (value ? 'до ' + dayjs(value).format('LLL') : undefined),
		},
		{
			key: 'actions',
			width: '1%',
			render: (value, record) => (
				<Space>
					{screens.md && <Button onClick={() => handleEditVacancy(record.id)}>Изменить</Button>}
					<Popconfirm
						title="Точно хотите закрыть вакансию?"
						okText="Да"
						cancelText="Нет"
						onConfirm={() => handleCloseVacancy(record.id)}
					>
						<Button type="text" danger>
							<HiOutlineLockClosed />
						</Button>
					</Popconfirm>
				</Space>
			),
		},
	]

	const handleEditVacancy = (id: string) => {
		setSelectedVacancyId(id)
		setShowVacancyModal(true)
	}

	const handleCloseVacancy = async (id: string) => {
		// await fetcher({ url: '/api/user/project/vacancy/close', data: { id } })
		await cancelVacany({ id })
		setSelectedVacancyId(undefined)
		fetchMyProjectVacancies()

		message.success('Вакансия закрыта')
	}

	const handleSaveVacancy = () => {
		setShowVacancyModal(false)
		setSelectedVacancyId(undefined)
		fetchMyProjectVacancies()
	}

	const handleRestoreVacation = (vacancyId: string) => {
		setShowVacancyArchiveModal(false)
		fetchMyProjectVacancies()

		setSelectedVacancyId(vacancyId)
		setShowVacancyModal(!!vacancyId)
	}

	return (
		<>
			<Flex justify="space-between" style={{ marginTop: 60 }}>
				<Space align="center">
					<h3 style={{ margin: 0 }}>Вакансии</h3>
					<Button onClick={() => setShowVacancyModal(true)}>Добавить вакансию</Button>
				</Space>
				<Button type="link" onClick={() => setShowVacancyArchiveModal(true)}>
					Архив
				</Button>
			</Flex>

			{projectVacancies?.data.length > 0 ? (
				<Table
					showHeader={false}
					loading={isLoadingMyMyProjectVacancies}
					style={{ border: '1px solid #aaa', overflow: 'hidden', borderRadius: 16, marginTop: 16 }}
					columns={vacanciesColumns}
					dataSource={projectVacancies?.data?.map((m: any) => ({ ...m, key: m.id }))}
					pagination={false}
				/>
			) : (
				<p style={{ marginTop: 12, color: 'gray' }}>На данный момент открытых вакансий нет</p>
			)}

			<VacancyModal
				teamId={teamId}
				vacancyId={selectedVacancyId}
				open={showVacancyModal}
				onCancel={() => {
					setShowVacancyModal(false)
					setSelectedVacancyId(undefined)
				}}
				onOk={handleSaveVacancy}
			/>

			<VacancyArchiveModal
				teamId={teamId}
				projectId={project?.id}
				projectName={project?.name}
				open={showVacancyArchiveModal}
				onCancel={() => {
					setShowVacancyArchiveModal(false)
				}}
				onRestore={handleRestoreVacation}
			/>
		</>
	)
}

export default MyProjectVacancies
