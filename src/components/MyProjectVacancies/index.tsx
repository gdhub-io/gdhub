import { useState } from 'react'
import VacancyModal from '@/components/modals/VacancyModal'
import { fetcher } from '@/helpers/fetcher'
import { useQuery } from '@tanstack/react-query'
import { Button, Grid, message, Popconfirm, Space, Table, Tag } from 'antd'
import { ColumnsType } from 'antd/lib/table'
import axios from 'axios'
import dayjs from 'dayjs'
import { HiOutlineLockClosed } from 'react-icons/hi'

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

interface MyProjectVacanciesArgs {
	teamId: string
}

const MyProjectVacancies = ({ teamId }: MyProjectVacanciesArgs) => {
	const screens = Grid.useBreakpoint()
	const [showVacancyModal, setShowVacancyModal] = useState(false)
	const [selectedVacancyId, setSelectedVacancyId] = useState<string>()
	// const {
	// 	data: projectVacancies,
	// 	mutate: fetchMyMyProjectVacancies,
	// 	isValidating: isLoadingMyMyProjectVacancies,
	// } = useSWR(
	// 	{ url: '/api/my/project-vacancies', data: { projectId: project?.id, projectName: project?.Name } },
	// 	fetcher,
	// 	{
	// 		revalidateOnFocus: false,
	// 		isPaused: () => !project,
	// 	}
	// )

	const {
		data: projectVacancies,
		refetch: fetchMyMyProjectVacancies,
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

	const vacanciesColumns: ColumnsType<Vacancy> = [
		{
			title: 'Название',
			dataIndex: 'title',
			key: 'title',
			width: '100%',
			render: (value, data) => (
				<>
					<span onClick={() => handleEditVacancy(data.id)}>{value}</span>{' '}
					{data.Status == 'Draft' && <Tag color="lime">{vacancyStatusToText(data.Status)}</Tag>}
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
			render: (value) => dayjs(value).format('DD.MM.YYYY'),
		},
		{
			key: 'actions',
			width: 1,
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
		await fetcher({ url: '/api/user/project/vacancy/close', data: { id } })
		fetchMyMyProjectVacancies()

		message.success('Вакансия удалена')
	}

	const handleSaveVacancy = () => {
		setShowVacancyModal(false)
		fetchMyMyProjectVacancies()
	}

	return (
		<>
			<Space align="center" style={{ marginTop: 60 }}>
				<h3 style={{ margin: 0 }}>Вакансии</h3>
				<Button onClick={() => setShowVacancyModal(true)}>Добавить вакансию</Button>
			</Space>

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
		</>
	)
}

export default MyProjectVacancies
