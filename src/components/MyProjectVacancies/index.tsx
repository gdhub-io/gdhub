import { useState } from 'react'
import VacancyModal from '@components/modals/VacancyModal'
import { fetcher } from '@helpers/fetcher'
import { Button, Grid, message, Popconfirm, Space, Table, Tag } from 'antd'
import { ColumnsType } from 'antd/lib/table'
import moment from 'moment'
import { HiOutlineTrash } from 'react-icons/hi'
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

interface MyProjectVacanciesArgs {
	project: any
}

const MyProjectVacancies = ({ project }: MyProjectVacanciesArgs) => {
	const screens = Grid.useBreakpoint()
	const [showVacancyModal, setShowVacancyModal] = useState(false)
	const [selectedVacancyId, setSelectedVacancyId] = useState<string>()
	const {
		data: projectVacancies,
		mutate: fetchMyMyProjectVacancies,
		isValidating: isLoadingMyMyProjectVacancies,
	} = useSWR(['/api/my/project-vacancies', { projectId: project?.id, projectName: project?.Name }], fetcher, {
		revalidateOnFocus: false,
		isPaused: () => !project,
	})

	const vacanciesColumns: ColumnsType<Vacancy> = [
		{
			title: 'Название',
			dataIndex: 'Name',
			key: 'Name',
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
			dataIndex: 'Direction',
			key: 'Direction',
			responsive: ['md'],
		},
		{
			title: 'Действует до',
			dataIndex: 'Finished At',
			key: 'Finished At',
			responsive: ['md'],
			render: (value) => moment(value).format('DD.MM.YYYY'),
		},
		{
			key: 'actions',
			width: 1,
			render: (value, record) => (
				<Space>
					{screens.md && <Button onClick={() => handleEditVacancy(record.id)}>Изменить</Button>}
					<Popconfirm
						title="Точно хотите удалить？"
						okText="Да"
						cancelText="Нет"
						onConfirm={() => handleDeleteVacancy(record.id)}
					>
						<Button type="text" danger>
							<HiOutlineTrash />
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

	const handleDeleteVacancy = async (id: string) => {
		await fetcher('/api/vacancy/delete', { id })
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

			<Table
				showHeader={false}
				loading={isLoadingMyMyProjectVacancies}
				style={{ border: '1px solid #aaa', overflow: 'hidden', borderRadius: 16, marginTop: 16 }}
				columns={vacanciesColumns}
				dataSource={projectVacancies?.data?.map((m: any) => ({ ...m, key: m.id }))}
				pagination={false}
			/>

			<VacancyModal
				projectId={project?.id}
				projectName={project?.Name}
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
