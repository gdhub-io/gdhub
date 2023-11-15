import { useState } from 'react'
import VacancyModal from '@/components/modals/VacancyModal'
import { fetcher } from '@/helpers/fetcher'
import { Button, Col, Grid, message, Popconfirm, Row, Space, Table, Tag } from 'antd'
import { ColumnsType } from 'antd/lib/table'
import dayjs from 'dayjs'
import { HiOutlineLockClosed } from 'react-icons/hi'
import useSWR from 'swr'
import VacancyArchiveModal from '../modals/VacancyArchiveModal'

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
	const [showVacancyArchiveModal, setShowVacancyArchiveModal] = useState(false)
	const [selectedVacancyId, setSelectedVacancyId] = useState<string>()
	const {
		data: projectVacancies,
		mutate: fetchMyMyProjectVacancies,
		isValidating: isLoadingMyMyProjectVacancies,
	} = useSWR(
		{ url: '/api/my/project-vacancies', data: { projectId: project?.id, projectName: project?.Name } },
		fetcher,
		{
			revalidateOnFocus: false,
			isPaused: () => !project,
		}
	)

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
		await fetcher({ url: '/api/vacancy/close', data: { id } })
		fetchMyMyProjectVacancies()

		message.success('Вакансия удалена')
	}

	const handleSaveVacancy = () => {
		setShowVacancyModal(false)
		fetchMyMyProjectVacancies()
	}

	const handleRestoreVacation = (vacancyId: string) => {
		setShowVacancyArchiveModal(false)
		fetchMyMyProjectVacancies()

		setSelectedVacancyId(vacancyId)
		setShowVacancyModal(!!vacancyId)
	}

	return (
		<>
			<Row style={{ marginTop: 60 }}>
				<Col flex={1}>
					<Space align="center">
						<h3 style={{ margin: 0 }}>Вакансии</h3>
						<Button onClick={() => setShowVacancyModal(true)}>Добавить вакансию</Button>
					</Space>
				</Col>
				<Col>
					<Button type="link" onClick={() => setShowVacancyArchiveModal(true)}>
						Архив
					</Button>
				</Col>
			</Row>

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

			<VacancyArchiveModal
				projectId={project?.id}
				projectName={project?.Name}
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
