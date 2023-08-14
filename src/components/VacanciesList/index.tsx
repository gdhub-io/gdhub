import { useState } from 'react'
import VacancyPreviewModal from '@/components/modals/VacancyPreviewModal'
import { TeamVacancy } from '@prisma/client'
import { useQuery } from '@tanstack/react-query'
import { Button, Space, Table } from 'antd'
import { ColumnsType } from 'antd/lib/table'
import axios from 'axios'
import dayjs from 'dayjs'
import Link from 'next/link'

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

const VacanciesList = () => {
	const [showVacancyPreviewModal, setShowVacancyPreviewModal] = useState(false)
	const [selectedVacancyId, setSelectedVacancyId] = useState<string>()
	const {
		data: vacancies,
		isLoading: isLoadingMyVacanciesList,
		refetch: refetchVacanciesList,
	} = useQuery(
		['vacancies'],
		() => axios.get<TeamVacancy & { team: { project: { slug: string; name: string } } }[]>('/api/vacancies'),
		{
			refetchOnWindowFocus: false,
			refetchInterval: 60000,
		}
	)

	const vacanciesColumns: ColumnsType<TeamVacancy & { team: { project: { slug: string; name: string } } }> = [
		{
			title: 'Название',
			dataIndex: 'name',
			key: 'name',
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
			width: '40%',
			render: (record) => (
				<>
					<Link href={`/project/${record.team.project.slug}`}>
						<Button type="text">{record.team.project.name}</Button>
					</Link>
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
					Все участники проектов, откликаясь на вакансии, принимают условия, что на момент участия в Лаборатории Игр,
					работа не оплачивается. Затраченное вами время - это инвестиции в проект, который вы выбираете. От того, как
					каждый член команды, и команда в целом, будет работать на проекте, зависит, смогут ли эти инвестиции
					конвертироваться в деньги или нет. В любом случае ваше резюме станет более весомым, когда в нем будет
					информация об участии в реальных проектах.
				</p>
			</Space>

			{!!vacancies?.data ? (
				<>
					<Table
						loading={isLoadingMyVacanciesList}
						style={{ border: '1px solid #aaa', overflow: 'hidden', borderRadius: 16, marginTop: 16 }}
						columns={vacanciesColumns}
						dataSource={vacancies.data as any[]}
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
