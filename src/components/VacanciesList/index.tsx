import { useState } from 'react'
import VacancyPreviewModal from '@/components/modals/VacancyPreviewModal'
import { TeamVacancy, WorkDirection } from '@prisma/client'
import { useQuery } from '@tanstack/react-query'
import { T } from '@tolgee/react'
import { Button, Col, Row, Space, Typography } from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'
import { GoArrowDownRight } from 'react-icons/go'
import styles from './style.module.scss'

const { Title, Text } = Typography

const VacanciesList = () => {
	const [showVacancyPreviewModal, setShowVacancyPreviewModal] = useState(false)
	const [selectedVacancyId, setSelectedVacancyId] = useState<string>()
	const { data: vacancies } = useQuery(
		['vacancies'],
		() =>
			axios.get<
				(TeamVacancy & {
					direction: WorkDirection
					project: { id: string; slug: string; name: string; description: string }
				})[]
			>('/api/vacancies'),
		{
			refetchOnWindowFocus: false,
			refetchInterval: 60000,
		}
	)

	const handleShowVacancy = (id: string) => {
		setSelectedVacancyId(id)
		setShowVacancyPreviewModal(true)
	}

	const handleCloseVacancy = () => {
		setSelectedVacancyId(undefined)
		setShowVacancyPreviewModal(false)
	}

	return (
		<>
			<Space direction="vertical">
				<p className={styles.description}>
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
					<Row gutter={[32, 32]} wrap>
						{vacancies.data.map((vacancy, idx) => {
							return (
								<Col xs={24} sm={12} lg={8} xxl={6} key={idx} className={styles.col}>
									<div
										className={[
											styles.vacancyCard,
											'bg-direc-' + vacancy.direction.name.replace(' & ', '-').replace(' ', '-'),
										].join(' ')}
									>
										<div className={styles.validDate}>
											<T>Valid until</T> {dayjs(vacancy.finishedAt).format('ll')}
										</div>
										<div className={styles.content}>
											<Title level={2} className={styles.title}>
												{vacancy.title}
											</Title>

											<div className={styles.projectName}>{vacancy.project.name}</div>
										</div>
										<Button
											className={styles.linkBtn}
											icon={<GoArrowDownRight size={24} onClick={() => handleShowVacancy(vacancy.id)} />}
											type="primary"
										/>
									</div>
								</Col>
							)
						})}
					</Row>

					<VacancyPreviewModal
						vacancyId={selectedVacancyId}
						open={showVacancyPreviewModal}
						onCancel={() => {
							setShowVacancyPreviewModal(false)
							setSelectedVacancyId(undefined)
						}}
						onOk={handleCloseVacancy}
					/>
				</>
			) : (
				<p>На данный момент открытых вакансий нет</p>
			)}
		</>
	)
}

export default VacanciesList
