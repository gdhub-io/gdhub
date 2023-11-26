import { useState } from 'react'
import VacancyPreviewModal from '@/components/modals/VacancyPreviewModal'
import { useWorkDirections } from '@/hooks/library'
import { TeamVacancy } from '@prisma/client'
import { useQuery } from '@tanstack/react-query'
import { Button, Space, Table } from 'antd'
import { ColumnsType } from 'antd/lib/table'
import axios from 'axios'
import dayjs from 'dayjs'
import Link from 'next/link'

const VacanciesList = () => {
	const { data: workDirections, getDirectionName } = useWorkDirections()
	const [showVacancyPreviewModal, setShowVacancyPreviewModal] = useState(false)
	const [selectedVacancyId, setSelectedVacancyId] = useState<string>()
	const {
		data: vacancies,
		isLoading: isLoadingMyVacanciesList,
		refetch: refetchVacanciesList,
	} = useQuery(
		['vacancies'],
		() => axios.get<(TeamVacancy & { project: { id: string; slug: string; name: string } })[]>('/api/vacancies'),
		{
			refetchOnWindowFocus: false,
			refetchInterval: 60000,
		}
	)

	const vacanciesColumns: ColumnsType<TeamVacancy & { project: { id: string; slug: string; name: string } }> = [
		{
			title: 'Название',
			dataIndex: 'title',
			key: 'title',
			width: '40%',
			render: (value, record) => (
				<>
					<span style={{ cursor: 'pointer', fontWeight: 'bold' }} onClick={() => handleEditVacancy(record.id)}>
						{value}
					</span>
				</>
			),
		},
		{
			title: 'Проект',
			dataIndex: 'teamId',
			key: 'teamId',
			// width: '40%',
			render: (value, record) => (
				<>
					<Link href={`/project/${record.project.slug}`}>
						<Button type="text">{record.project.name}</Button>
					</Link>
				</>
			),
		},
		{
			title: 'Направление',
			dataIndex: 'directionId',
			responsive: ['md'],
			key: 'directionId',
			render: (value) => getDirectionName(value),
		},
		{
			title: 'Действует до',
			dataIndex: 'finishedAt',
			responsive: ['md'],
			key: 'finishedAt',
			render: (value) => dayjs(value).format('DD.MM.YYYY'),
		},
	]

	const handleEditVacancy = (id: string) => {
		setSelectedVacancyId(id)
		setShowVacancyPreviewModal(true)
	}

	const handleSaveVacancy = () => {
		setShowVacancyPreviewModal(false)
		refetchVacanciesList()
	}

	return (
		<>
			<Space direction="vertical">
				<p style={{ fontSize: 12 }}>
					Все участники проектов, откликаясь на вакансии, принимают условия, что на период участия в выбранном проекте,
					работа не оплачивается до момента получения финансирования или если, иные условия не указаны в вакансии.
					Затраченное вами время - это инвестиции в проект, который вы выбираете. От того, как каждый член команды, и
					команда в целом, будет работать на проекте, зависит, смогут ли эти инвестиции конвертироваться в деньги или
					нет. В любом случае ваше резюме станет более весомым, когда в нем будет информация об участии в реальных
					проектах.
				</p>
			</Space>

			{!!vacancies?.data ? (
				<>
					<Table
						loading={isLoadingMyVacanciesList}
						style={{ border: '1px solid #aaa', overflow: 'hidden', borderRadius: 16, marginTop: 16 }}
						columns={vacanciesColumns}
						dataSource={vacancies.data}
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

export default VacanciesList
