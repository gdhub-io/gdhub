import { useEffect } from 'react'
import React from 'react'
import { useGameDifficulties, useGameGenres, useGameSettings } from '@/hooks/library'
import {
	GameDifficultyLevel,
	GameGenre,
	GameSetting,
	Profile,
	Project,
	Speciality,
	TeamMember,
	TeamVacancy,
	User,
} from '@prisma/client'
import { TbBrandTelegram } from '@react-icons/all-files/tb/TbBrandTelegram'
import { TbMail } from '@react-icons/all-files/tb/TbMail'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Button, Col, Descriptions, Form, message, Modal, Row, Space, Spin } from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'
import Image from 'next/image'
import Link from 'next/link'
import styles from './style.module.scss'

const ProjectCandidatePreviewModal = ({ candidateId, open, onOk, onCancel }: any) => {
	const queryClient = useQueryClient()
	const { t } = useTolgee()
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
					team: { project: Project }
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
		{ enabled: !!candidateId, refetchInterval: false, refetchOnWindowFocus: false }
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

			message.success(t('You rejected the candidacy ') + candidate?.data.user.name)
			onOk()
		} catch (error: any) {
			message.error(error.message)
		}
	}

	const handleApprove = async () => {
		try {
			await hireCandidate({ id: candidateId })

			message.success(t(`You took the team`) + ' ' + candidate?.data.user.name)
			onOk()
		} catch (error: any) {
			message.error(error.message)
		}
	}

	return (
		<>
			<Modal
				centered
				title={<T>Candidate card</T>}
				width={800}
				destroyOnClose
				maskClosable={false}
				open={open}
				onCancel={handleCancel}
				confirmLoading={processing}
				footer={[
					<Space key="form-buttons" wrap>
						<Button key="close" onClick={handleCancel} disabled={processing}>
							<T>Close</T>
						</Button>
						<Button key="reject" disabled={processing} onClick={handleReject}>
							<T>Reject</T>
						</Button>
						<Button key="approve" disabled={processing} type="primary" onClick={handleApprove}>
							<T>Accept the team</T>
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
										<Descriptions.Item label={t('Interested in the vacancy')}>
											{candidate.data.vacancy.title}
										</Descriptions.Item>
										<Descriptions.Item label={t('On the project')}>
											{candidate.data.team.project.name}
										</Descriptions.Item>
										<Descriptions.Item label={t('Created')}>
											{dayjs(candidate.data.createdAt).format('LLL')}
										</Descriptions.Item>
									</Descriptions>

									<Descriptions
										title={t('About the participant')}
										className={styles.descriptionBlock}
										layout="horizontal"
										column={1}
										size="small"
										labelStyle={{ fontWeight: 'bold' }}
									>
										{!!candidate?.data.speciality.portfolioUrl && (
											<Descriptions.Item label={<T>CV/Portfolio</T>}>
												<Link href={candidate?.data.speciality.portfolioUrl} target="_blank">
													<Button size="small">
														<T>Go</T>
													</Button>
												</Link>
											</Descriptions.Item>
										)}
										<Descriptions.Item label={<T>Free time</T>}>
											<T
												keyName="fromTo"
												defaultValue="from {fromDate} to {toDate} hours a week"
												params={{
													fromDate: candidate.data.user.profile.timeForWork[0],
													toDate: candidate.data.user.profile.timeForWork[1],
												}}
											/>
										</Descriptions.Item>
										<Descriptions.Item label={<T>Place of residence</T>}>
											{[candidate.data.user.profile.country, candidate.data.user.profile.city].join(', ')}
										</Descriptions.Item>
										<Descriptions.Item label={<T>Motivation</T>}>
											{candidate.data.user.profile.motivation}
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
								title={t('About specialty')}
								className={styles.descriptionBlock}
								layout="vertical"
								column={1}
								size="small"
								labelStyle={{ fontWeight: 'bold' }}
							>
								<Descriptions.Item label={t('Specialization')}>
									{candidate.data.speciality.specialization}
								</Descriptions.Item>
								<Descriptions.Item label={t('Skills')}>{candidate.data.speciality.skills}</Descriptions.Item>
								<Descriptions.Item label={t('I use it in work')}>
									{candidate.data.speciality.tools || t('(tools are not indicated)')}
								</Descriptions.Item>
								<Descriptions.Item label={t('Experience')}>
									{candidate.data.speciality.jobs || t('(places of work are not indicated)')}
								</Descriptions.Item>
								<Descriptions.Item label={t('Where I received knowledge')}>
									{candidate.data.speciality.schools || t('(places of training are not indicated)')}
								</Descriptions.Item>
							</Descriptions>

							<Descriptions
								title={t('Preferences in games')}
								layout="vertical"
								column={1}
								size="small"
								labelStyle={{ fontWeight: 'bold' }}
								className={styles.descriptionBlock}
							>
								<Descriptions.Item label={t('I prefer genres')}>
									{candidate.data.user.profile.preferedGenres ? (
										candidate.data.user.profile.preferedGenres.map((r) => getGameGenreName(r.id)).join(', ')
									) : (
										<T>(not pointed)</T>
									)}
								</Descriptions.Item>
								<Descriptions.Item label={t('I prefer game settings')}>
									{candidate.data.user.profile.preferedSettings ? (
										candidate.data.user.profile.preferedSettings.map((r) => getGameSettingName(r.id)).join(', ')
									) : (
										<T>(not pointed)</T>
									)}
								</Descriptions.Item>
								<Descriptions.Item label={t('I prefer games of the following complexity')}>
									{candidate.data.user.profile.preferedDifficulties ? (
										candidate.data.user.profile.preferedDifficulties.map((r) => getGameDifficultyName(r.id)).join(', ')
									) : (
										<T>(not pointed)</T>
									)}
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
