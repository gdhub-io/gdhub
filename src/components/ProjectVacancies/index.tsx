import { useState } from 'react'
import { Button, Space, Table, Tag, Typography } from 'antd'
import { ColumnsType } from 'antd/lib/table'
import dayjs from 'dayjs'
import useSWR from 'swr'
import VacancyPreviewModal from '@/components/modals/VacancyPreviewModal'
import { fetcher } from '@/helpers/fetcher'

const { Title } = Typography

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
	const [showVacancyPreviewModal, setShowVacancyPreviewModal] = useState(false)
	const [selectedVacancyId, setSelectedVacancyId] = useState<string>()
	const {
		data: projectVacancies,
		mutate: fetchMyProjectVacancies,
		isValidating: isLoadingMyProjectVacancies,
	} = useSWR(
		{ url: '/api/project/vacancies', data: { projectId: project?.id, projectName: project?.Name, Status: 'Opened' } },
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
			render: (value) => dayjs(value).format('DD.MM.YYYY'),
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
			<Space direction="vertical" style={{ marginTop: 60 }}>
				<Title level={5}>Вакансии</Title>
				{projectVacancies?.data.length > 0 && (
					<p style={{ fontSize: 12 }}>
						Все участники проектов, откликаясь на вакансии, принимают условия, что на момент участия в Лаборатории Игр,
						работа не оплачивается. Затраченное вами время - это инвестиции в проект, который вы выбираете. От того, как
						каждый член команды, и команда в целом, будет работать на проекте, зависит, смогут ли эти инвестиции
						конвертироваться в деньги или нет. В любом случае ваше резюме станет более весомым, когда в нем будет
						информация об участии в реальных проектах.
					</p>
				)}
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
