import { useState } from 'react'
import VacancyPreviewModal from '@/components/modals/VacancyPreviewModal'
import { TeamVacancy, WorkDirection } from '@prisma/client'
import { GoArrowDownRight } from '@react-icons/all-files/go/GoArrowDownRight'
import { useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Button, Space, Row, Col, Tag, Typography } from 'antd'
import { ColumnsType } from 'antd/es/table'
import axios from 'axios'
import dayjs from 'dayjs'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import styles from './style.module.scss'

const { Title } = Typography

interface Vacancy {
	key: string
	title: string
	description: string
	finishedAt: string
	status: string
	[key: string]: any
}

interface ProjectVacanciesArgs {
	teamId: string
}

const ProjectVacancies = ({ teamId }: ProjectVacanciesArgs) => {
	const { data: session } = useSession()
	const router = useRouter()
	const { t } = useTolgee()
	const [showVacancyPreviewModal, setShowVacancyPreviewModal] = useState(false)
	const [selectedVacancyId, setSelectedVacancyId] = useState<string>()

	const { data: workDirections } = useQuery(
		['workDirections'],
		() => axios.get<WorkDirection[]>('/api/dictionary/work-directions'),
		{
			staleTime: Infinity,
		}
	)

	const {
		data: projectVacancies,
		refetch: fetchMyProjectVacancies,
		isFetching: isLoadingMyProjectVacancies,
	} = useQuery(
		['team-vacancy', teamId],
		() =>
			axios.get<
				(TeamVacancy & {
					direction: WorkDirection
					project: { id: string; slug: string; name: string; description: string }
				})[]
			>('/api/project/vacancies', { params: { teamId: teamId } }),
		{
			enabled: !!teamId,
		}
	)

	const vacanciesColumns: ColumnsType<Vacancy> = [
		{
			title: t('Name'),
			dataIndex: 'title',
			key: 'title',
			width: '60%',
			render: (value, record) =>
				session ? (
					<>
						<span style={{ cursor: 'pointer', fontWeight: 'bold' }} onClick={() => handleEditVacancy(record.id)}>
							{value}
						</span>{' '}
						{record.status == 'draft' && (
							<Tag color="lime">
								<T keyName={record.status} />
							</Tag>
						)}
					</>
				) : (
					<span style={{ fontWeight: 'bold' }}>{value}</span>
				),
		},
		{
			title: t('Direction'),
			dataIndex: 'directionId',
			responsive: ['md'],
			key: 'directionId',
			render(value) {
				const direction = workDirections?.data.find((direction) => direction.id == value)
				return direction?.name || 'unknown'
			},
		},
		{
			title: t('Valid until'),
			dataIndex: 'finishedAt',
			responsive: ['md'],
			key: 'finishedAt',
			render: (value) => dayjs(value).format('DD.MM.YYYY'),
		},
		{
			key: 'actions',
			responsive: ['md'],
			render: (value, record) =>
				session ? (
					<Button onClick={() => handleEditVacancy(record.id)}>
						<T>Details</T>
					</Button>
				) : (
					<Link href={`/signin?callbackUrl=${router.asPath}`}>
						<Button>
							<T>Enter to see</T>
						</Button>
					</Link>
				),
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

	const handleShowVacancy = (id: string) => {
		setSelectedVacancyId(id)
		setShowVacancyPreviewModal(true)
	}

	const handleCloseVacancy = () => {
		setSelectedVacancyId(undefined)
		setShowVacancyPreviewModal(false)
	}

	if (!projectVacancies?.data) return null

	return (
		<>
			<Space direction="vertical" style={{ width: '100%' }}>
				<Title level={2}>
					<T>Vacancies</T>
				</Title>
				{!!projectVacancies?.data.length && (
					<p style={{ fontSize: 12 }}>
						<T keyName="vacancies.list.description">
							All project participants, responding to vacancies, accept the conditions that for the period of
							participation in the selected project, work is not paid until the moment of receipt of funding or if,
							other conditions are not indicated in vacancies.The time you spent is investment in the project that you
							choose.From how every member teams, and the team as a whole, will work on the project, depends whether
							these investments will be able to convert In money or not.In any case, your resume will become more
							significant when it will have information about participation In real projects.
						</T>
					</p>
				)}
			</Space>

			{!!projectVacancies?.data ? (
				<>
					<Row gutter={[32, 32]} wrap>
						{projectVacancies.data.map((vacancy, idx) => {
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
				<p>
					<T>There are no open vacancies at the moment</T>
				</p>
			)}
		</>
	)
}

export default ProjectVacancies
