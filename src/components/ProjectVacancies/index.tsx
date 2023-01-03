import { useState } from 'react'
import VacancyPreviewModal from '@components/modals/VacancyPreviewModal'
import { fetcher } from '@helpers/fetcher'
import { Button, Grid, Space, Table, Tag } from 'antd'
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

interface ProjectVacanciesArgs {
	project: any
}

const ProjectVacancies = ({ project }: ProjectVacanciesArgs) => {
	const screens = Grid.useBreakpoint()
	const [showVacancyPreviewModal, setShowVacancyPreviewModal] = useState(false)
	const [selectedVacancyId, setSelectedVacancyId] = useState<string>()
	const {
		data: projectVacancies,
		mutate: fetchMyProjectVacancies,
		isValidating: isLoadingMyProjectVacancies,
	} = useSWR(
		['/api/project/vacancies', { projectId: project?.id, projectName: project?.Name, Status: 'Opened' }],
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
			width: '60%',
			render: (value, record) => (
				<>
					<span style={{ cursor: 'pointer', fontWeight: 'bold' }} onClick={() => handleEditVacancy(record.id)}>
						{value}
					</span>{' '}
					{record.Status == 'Draft' && <Tag color="lime">{vacancyStatusToText(record.Status)}</Tag>}
				</>
			),
		},
		{
			title: 'Направление',
			dataIndex: 'Direction',
			responsive: ['md'],
			key: 'Direction',
		},
		{
			title: 'Действует до',
			dataIndex: 'Finished At',
			responsive: ['md'],
			key: 'Finished At',
			render: (value) => moment(value).format('DD.MM.YYYY'),
		},
		{
			key: 'actions',
			responsive: ['md'],
			render: (value, record) => <Button onClick={() => handleEditVacancy(record.id)}>Подробнее</Button>,
		},
	]

	const handleEditVacancy = (id: string) => {
		setSelectedVacancyId(id)
		setShowVacancyPreviewModal(true)
	}

	const handleSaveVacancy = () => {
		setShowVacancyPreviewModal(false)
		fetchMyProjectVacancies()
	}

	return (
		<>
			<Space align="center" style={{ marginTop: 60 }}>
				<h3 style={{ margin: 0 }}>Вакансии</h3>
			</Space>

			{projectVacancies?.data.length > 0 ? (
				<>
					<Table
						loading={isLoadingMyProjectVacancies}
						style={{ border: '1px solid #aaa', overflow: 'hidden', borderRadius: 16, marginTop: 16 }}
						columns={vacanciesColumns}
						dataSource={projectVacancies?.data?.map((m: any) => ({ ...m, key: m.id }))}
						pagination={false}
					/>

					<VacancyPreviewModal
						project={project}
						vacancyId={selectedVacancyId}
						open={showVacancyPreviewModal}
						onCancel={() => {
							setShowVacancyPreviewModal(false)
							setSelectedVacancyId(undefined)
						}}
						onOk={handleSaveVacancy}
					/>
				</>
			) : (
				<p>На данный момент открытых вакансий нет</p>
			)}
		</>
	)
}

export default ProjectVacancies
