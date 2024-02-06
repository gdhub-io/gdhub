import { useEffect } from 'react'
import { useGameDifficulties, useGameGenres, useGameSettings } from '@/hooks/library'
import {
	GameDifficultyLevel,
	GameGenre,
	GameSetting,
	Profile,
	Speciality,
	TeamMember,
	TeamVacancy,
	User,
} from '@prisma/client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Col, Descriptions, Form, message, Modal, Row, Space, Spin } from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'
import Image from 'next/image'
import Link from 'next/link'
import { TbBrandTelegram, TbMail } from 'react-icons/tb'
import styles from './style.module.scss'

const ProjectCandidatePreviewModal = ({ candidateId, open, onOk, onCancel }: any) => {
	const queryClient = useQueryClient()
	const [form] = Form.useForm()
	const { getGameGenreName } = useGameGenres()
	const { getGameSettingName } = useGameSettings()
	const { getGameDifficultyName } = useGameDifficulties()

	const {
		data: candidate,
		refetch: refetchCandidate,
		isFetching: processing,
	} = useQuery(
		['candidate', candidateId],
		() =>
			axios.get<
				TeamMember & {
					vacancy: TeamVacancy
					speciality: Speciality
					user: User & {
						specialities: Speciality[]
						profile: Profile & {
							preferedGenres: GameGenre[]
							preferedSettings: GameSetting[]
							preferedDifficulties: GameDifficultyLevel[]
						}
					}
				}
			>('/api/user/project/candidate', {
				params: { id: candidateId },
			}),
		{ enabled: !!candidateId }
	)

	const { mutateAsync: rejectCandidate, isLoading: isRejecting } = useMutation(
		(data: { id: string }) => axios.put<void>('/api/user/project/vacancy/candidate/reject', data),
		{
			onSuccess: () => {
				queryClient.invalidateQueries(['user-project-team', candidate?.data.teamId])
			},
		}
	)
	const { mutateAsync: hireCandidate, isLoading: isHiring } = useMutation(
		(data: { id: string }) => axios.put<void>('/api/user/project/vacancy/candidate/hire', data),
		{
			onSuccess: () => {
				queryClient.invalidateQueries(['user-project-team', candidate?.data.teamId])
			},
		}
	)

	useEffect(() => {
		if (open && candidateId) {
			refetchCandidate()
		}
	}, [open])

	const handleCancel = () => {
		form.resetFields()
		onCancel()
	}

	const handleReject = async () => {
		try {
			await rejectCandidate({ id: candidateId })

			message.success('Вы отклонили кандидатуру ' + candidate?.data.user.name)
			onOk()
		} catch (error: any) {
			console.log(error)
			message.error(error.message)
		}
	}

	const handleApprove = async () => {
		try {
			await hireCandidate({ id: candidateId })

			message.success(`Вы приняли ${candidate?.data.user.name} в команду`)
			onOk()
		} catch (error: any) {
			console.log(error)
			message.error(error.message)
		}
	}

	return (
		<>
			<Modal
				centered
				title="Карточка кандидата"
				width={800}
				destroyOnClose
				maskClosable={false}
				open={open}
				onCancel={handleCancel}
				confirmLoading={processing}
				footer={[
					<Space key="form-buttons" wrap>
						<Button key="close" onClick={handleCancel} disabled={processing}>
							Закрыть
						</Button>
						<Button key="reject" disabled={processing} onClick={handleReject}>
							Отклонить
						</Button>
						<Button key="approve" disabled={processing} type="primary" onClick={handleApprove}>
							Принять в команду
						</Button>
					</Space>,
				]}
			>
				<Spin spinning={processing}>
					{!!candidate && (
						<>
							<Row gutter={[24, 24]}>
								<Col xs={{ span: 24, order: 1 }} md={{ span: 18, order: 0 }}>
									<div className={styles.specialityTitle}>
										<h1>{candidate?.data.user.name}</h1>
										{candidate?.data.speciality.name} ({candidate?.data.speciality.level})
									</div>

									<Descriptions layout="horizontal" column={1} size="small" labelStyle={{ fontWeight: 'bold' }}>
										<Descriptions.Item label="Интересует вакансия">{candidate.data.vacancy.title}</Descriptions.Item>
										<Descriptions.Item label="На проекте">{candidate.data.teamId}</Descriptions.Item>
										<Descriptions.Item label="Создано">
											{dayjs(candidate.data.createdAt).format('LLL')}
										</Descriptions.Item>
									</Descriptions>

									<Descriptions
										title="Об участнике"
										className={styles.descriptionBlock}
										layout="horizontal"
										column={1}
										size="small"
										labelStyle={{ fontWeight: 'bold' }}
									>
										{!!candidate?.data.speciality.portfolioUrl && (
											<Descriptions.Item label="Резюме/портфолио">
												<Link href={candidate?.data.speciality.portfolioUrl} target="_blank">
													<Button size="small">Перейти</Button>
												</Link>
											</Descriptions.Item>
										)}
										<Descriptions.Item label="Свободное время">
											от {candidate.data.user.profile.timeForWork[0]} до {candidate.data.user.profile.timeForWork[1]}{' '}
											часов
										</Descriptions.Item>
										<Descriptions.Item label="Место проживания">
											{[candidate.data.user.profile.country, candidate.data.user.profile.city].join(', ')}
										</Descriptions.Item>
									</Descriptions>
								</Col>
								<Col xs={{ span: 24, order: 0 }} md={{ span: 6, order: 1 }}>
									<Space direction="vertical" align="center" style={{ width: '100%' }}>
										{!!candidate.data.user.image && (
											<div className={styles.avatar}>
												<Image src={candidate.data.user.image} alt="project member avatar" width={160} height={160} />
											</div>
										)}
										{!!candidate.data?.allowedContacts.includes('email') && (
											<Link target="_blank" href={'mailto:' + candidate.data.user.email}>
												<Button icon={<TbMail size={16} style={{ position: 'relative', marginRight: 5 }} />}>
													Email
												</Button>
											</Link>
										)}

										{!!candidate.data?.allowedContacts.includes('telegram') && (
											<Link target="_blank" href={'https://t.me/' + candidate.data?.user.profile.tgNickname}>
												<Button icon={<TbBrandTelegram size={16} style={{ position: 'relative', marginRight: 5 }} />}>
													Telegram
												</Button>
											</Link>
										)}
									</Space>
								</Col>
							</Row>

							<Descriptions
								title="О специальности"
								className={styles.descriptionBlock}
								layout="vertical"
								column={1}
								size="small"
								labelStyle={{ fontWeight: 'bold' }}
							>
								<Descriptions.Item label="Специализация">{candidate.data.speciality.specialization}</Descriptions.Item>
								<Descriptions.Item label="Навыки">{candidate.data.speciality.skills}</Descriptions.Item>
								<Descriptions.Item label="Использую в работе">
									{candidate.data.speciality.tools || '(инструменты не указаны)'}
								</Descriptions.Item>
								<Descriptions.Item label="Опыт работы">
									{candidate.data.speciality.jobs || '(места работ не указаны)'}
								</Descriptions.Item>
								<Descriptions.Item label="Где получал знания">
									{candidate.data.speciality.schools || '(места обучения не указаны)'}
								</Descriptions.Item>
							</Descriptions>

							<Descriptions
								title="Предпочтения в играх"
								layout="vertical"
								column={1}
								size="small"
								labelStyle={{ fontWeight: 'bold' }}
								className={styles.descriptionBlock}
							>
								<Descriptions.Item label="Предпочитаю жанры">
									{candidate.data.user.profile.preferedGenres
										? candidate.data.user.profile.preferedGenres.map((r) => getGameGenreName(r.id)).join(', ')
										: '(не указано)'}
								</Descriptions.Item>
								<Descriptions.Item label="Предпочитаю сеттинги">
									{candidate.data.user.profile.preferedSettings
										? candidate.data.user.profile.preferedSettings.map((r) => getGameSettingName(r.id)).join(', ')
										: '(не указано)'}
								</Descriptions.Item>
								<Descriptions.Item label="Предпочитаю игры следующей сложности">
									{candidate.data.user.profile.preferedDifficulties
										? candidate.data.user.profile.preferedDifficulties
												.map((r) => getGameDifficultyName(r.id))
												.join(', ')
										: '(не указано)'}
								</Descriptions.Item>
							</Descriptions>
						</>
					)}
				</Spin>
			</Modal>
		</>
	)
}

export default ProjectCandidatePreviewModal
