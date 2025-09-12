import { useState } from 'react'
import VacancyPreviewModal from '@/components/modals/VacancyPreviewModal'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { GoArrowDownRight } from '@react-icons/all-files/go/GoArrowDownRight'
import { useQuery } from '@tanstack/react-query'
import { useTolgee } from '@tolgee/react'
import { Col, Row, Space, Typography } from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'
import styles from './style.module.scss'

const { Title, Text } = Typography

const VacanciesList = () => {
	const { t } = useTolgee()
	const [showVacancyPreviewModal, setShowVacancyPreviewModal] = useState(false)
	const [selectedVacancyId, setSelectedVacancyId] = useState<string>()
	const { data: vacancies } = useQuery({
		queryKey: ['vacancies'],
		queryFn: () =>
			axios.get<
				(prismaClient.TeamVacancy & {
					direction: prismaClient.WorkDirection
					team: { project: { id: string; slug: string; name: string; description: string } }
				})[]
			>('/api/vacancies'),
		refetchOnWindowFocus: false,
		refetchInterval: 60000,
	})

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
					{t(
						'vacancies.list.description',
						`
						All project participants, responding to vacancies, accept the conditions that for the period of
						participation in the selected project, work is not paid until the moment of receipt of funding or if, other
						conditions are not indicated in vacancies.The time you spent is investment in the project that you
						choose.From how every member teams, and the team as a whole, will work on the project, depends whether these
						investments will be able to convert In money or not.In any case, your resume will become more significant
						when it will have information about participation In real projects.
					`
					)}
				</p>
			</Space>

			{!!vacancies?.data ? (
				<>
					<Row gutter={[32, 32]} wrap>
						{vacancies.data.map((vacancy, idx) => {
							return (
								// Vacancy item
								<Col xs={24} sm={12} lg={8} xxl={6} key={idx} className={styles.col}>
									<div
										onClick={() => handleShowVacancy(vacancy.id)}
										className={[
											styles.vacancyCard,
											'bg-direc-' + vacancy.direction.name.replace(' & ', '-').replace(' ', '-'),
										].join(' ')}
									>
										<div className={styles.validDate}>
											{t('vacancies.list.validUntil', 'Valid until')} {dayjs(vacancy.finishedAt).format('ll')}
										</div>
										<div className={styles.content}>
											<Title level={2} className={styles.title}>
												{vacancy.title}
											</Title>

											<div className={styles.projectName}>{vacancy.team.project?.name}</div>
											{vacancy.promisePercentage ? (
												<div style={{ marginTop: 8 }}>
													<Space size={4}>
														<Text strong type="success">
															{t('modal.vacancy.equityPromise', 'Equity Promise')}:
														</Text>
														<Text type="success">{vacancy.promisePercentage}%</Text>
													</Space>
												</div>
											) : null}
										</div>
										<div className={styles.linkBtn}>
											<GoArrowDownRight size={24} />
										</div>
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
				<p>{t('vacancies.list.noOpenVacancies', 'There are no open vacancies at the moment')}</p>
			)}
		</>
	)
}

export default VacanciesList
