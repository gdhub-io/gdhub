import { useState } from 'react'
import { Button, Space, Table } from 'antd'
import { ColumnsType } from 'antd/lib/table'
import moment from 'moment'
import Link from 'next/link'
import useSWR from 'swr'
import VacancyPreviewModal from '@/components/modals/VacancyPreviewModal'
import { fetcher } from '@/helpers/fetcher'

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

const VacanciesList = () => {
	const [showVacancyPreviewModal, setShowVacancyPreviewModal] = useState(false)
	const [selectedVacancyId, setSelectedVacancyId] = useState<string>()
	const {
		data: VacanciesList,
		isValidating: isLoadingMyVacanciesList,
		mutate: fetchVacanciesList,
	} = useSWR({ url: '/api/vacancies' }, fetcher, {
		revalidateOnFocus: false,
		refreshInterval: 10000,
	})

	const vacanciesColumns: ColumnsType<Vacancy> = [
		{
			title: 'Название',
			dataIndex: 'Name',
			key: 'Name',
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
			dataIndex: 'Project',
			key: 'Project',
			width: '40%',
			render: (value, record) => (
				<>
					<Link href={`/project/${record['Project Slug'][0]}`}>
						<Button type="text">{record['Project Name']}</Button>
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
			render: (value) => moment(value).format('DD.MM.YYYY'),
		},
	]

	const handleEditVacancy = (id: string) => {
		setSelectedVacancyId(id)
		setShowVacancyPreviewModal(true)
	}

	const handleSaveVacancy = () => {
		setShowVacancyPreviewModal(false)
		fetchVacanciesList()
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

			{VacanciesList?.data.length > 0 ? (
				<>
					<Table
						loading={isLoadingMyVacanciesList}
						style={{ border: '1px solid #aaa', overflow: 'hidden', borderRadius: 16, marginTop: 16 }}
						columns={vacanciesColumns}
						dataSource={VacanciesList?.data?.map((m: any) => ({ ...m, key: m.id }))}
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
