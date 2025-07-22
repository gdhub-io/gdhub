import { useEffect, useState } from 'react'
import { TextWithLineBreak } from '@/components/TextWithLineBreak'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Alert, Button, Card, Col, Form, message, Modal, Row, Space, Spin, Typography } from 'antd'
import { theme } from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import styles from './style.module.scss'
import SpecialitySelectModal from '../SpecialitySelectModal'

const { Text, Title, Paragraph } = Typography

const VacancyPreviewModal = ({ vacancyId, open, onOk, onCancel }: any) => {
	const { token } = theme.useToken()
	const session: any = useSession()
	const { t } = useTolgee()
	const router = useRouter()
	const [form] = Form.useForm()
	const [showSpecialitySelectModal, setShowSpecialitySelectModal] = useState(false)
	const [showPitchVideo, setShowPitchVideo] = useState(false)

	const {
		data: vacancy,
		refetch: refetchVacancy,
		isFetching: processing,
	} = useQuery(
		['vacancy', vacancyId],
		() =>
			axios.get<
				prismaClient.TeamVacancy & {
					promiseStep: prismaClient.ProjectWorkflowStep
					team: {
						project: {
							id: string
							slug: string
							name: string
							description: string
							coverImage: string
							videoLink: string
							workflow: prismaClient.ProjectWorkflow & { steps: prismaClient.ProjectWorkflowStep[] }
						}
					}
					myTeamMemberId: string
				}
			>('/api/project/vacancy', {
				params: { id: vacancyId },
			}),
		{
			enabled: !!vacancyId,
			refetchOnWindowFocus: false,
		}
	)

	const { mutateAsync: withdrawApply } = useMutation((data: { teamMemberId: string }) =>
		axios.put<void>('/api/user/project/vacancy/withdraw', data)
	)

	const { mutateAsync: vacancyApply } = useMutation(
		(data: { specialityId: string; contactType: string[]; telegramNickname?: string; vacancyId: string }) =>
			axios.post<void>('/api/user/project/vacancy/apply', data)
	)

	useEffect(() => {
		if (open && vacancyId && session?.data) {
			refetchVacancy()
		}
	}, [open])

	const handleCancel = () => {
		form.resetFields()
		onCancel()
	}

	const handleSpecialitySelect = async ({
		specialityId,
		contactType,
		telegramNickname,
	}: {
		specialityId: any
		contactType: string[]
		telegramNickname?: string
	}) => {
		if (!vacancy) return

		try {
			await vacancyApply({
				specialityId,
				contactType,
				telegramNickname,
				vacancyId: vacancy.data.id,
			})

			message.success(t('modal.vacancy.applySuccess', 'Your response is sent'))
			setShowSpecialitySelectModal(false)
			setTimeout(onCancel, 600)
		} catch (error: any) {
			console.log(error)
			message.error(error.response?.data.message || error.message)
		}
	}

	const withdrawApplyHandler = async (data: { teamMemberId: string }) => {
		try {
			await withdrawApply(data)

			message.success(t('modal.vacancy.withdrawSuccess', 'Your response is withdrawn'))
			onCancel()
		} catch (error: any) {
			console.log(error)
			message.error(error.response?.data.message || error.message)
		}
	}

	const statusOkButton = () => {
		if (!session?.data) {
			return t('signin', 'Signin')
		}

		return vacancy?.data.myTeamMemberId
			? t('modal.vacancy.cancelMyResponse', 'Cancel my response')
			: t('modal.vacancy.apply', 'Respond')
	}

	const functionOkButton = async () => {
		if (!session?.data) {
			router.push('/signin?callbackUrl=' + router.asPath)
		}

		return vacancy?.data.myTeamMemberId
			? withdrawApplyHandler({ teamMemberId: vacancy.data.myTeamMemberId })
			: setShowSpecialitySelectModal(true)

		return null
	}

	const handleCoverClick = () => setShowPitchVideo(true)

	return (
		<>
			<Modal
				centered
				title={null}
				width={800}
				destroyOnClose
				maskClosable={false}
				open={open}
				onCancel={handleCancel}
				footer={[
					<Space key="form-buttons" wrap>
						<Button key="close" onClick={handleCancel} disabled={processing}>
							<T>Close</T>
						</Button>
						{session?.data && (
							<Button key="action" type="primary" onClick={functionOkButton} loading={processing}>
								{statusOkButton()}
							</Button>
						)}
					</Space>,
				]}
			>
				<Spin spinning={processing}>
					{!!vacancy && (
						<Space direction="vertical" style={{ width: '100%' }}>
							<div className={styles.cardHeader}>
								<Text type="secondary" className={styles.cardType}>
									<T>Vacancy card</T>
								</Text>
								<div className={styles.vacancyTitle}>
									<Title level={2} style={{ margin: 0 }}>
										{vacancy.data.title}
									</Title>
								</div>
							</div>

							{/* Project Information Card */}

							<Row gutter={[24, 24]}>
								<Col xs={24} md={14}>
									<Space direction="vertical" style={{ width: '100%' }}>
										<div>
											<Text type="secondary" className={styles.fieldLabel}>
												{t('modal.section.project', 'Project')}
											</Text>
											<Title level={4} style={{ margin: '8px 0' }}>
												{vacancy.data.team.project.name}
											</Title>
										</div>

										{vacancy.data.team.project.description && (
											<div>
												<Text type="secondary" className={styles.fieldLabel}>
													{t('modal.section.projectDescription', 'Project description')}
												</Text>
												<Paragraph style={{ margin: '8px 0' }}>
													{vacancy.data.team.project.description.slice(0, 200)}
													{vacancy.data.team.project.description.length > 200 && '...'}
												</Paragraph>
											</div>
										)}
									</Space>
								</Col>

								<Col xs={24} md={10}>
									{!showPitchVideo && vacancy.data.team.project.coverImage && (
										<div className={styles.projectCover}>
											{vacancy.data.team.project.videoLink && (
												<div className={styles.coverButtonContainer}>
													<Button onClick={handleCoverClick} type="primary" size="small">
														{t('modal.section.watch', 'Watch')}
													</Button>
												</div>
											)}
											<Image
												src={vacancy.data.team.project.coverImage}
												alt="Project cover"
												fill
												style={{ objectFit: 'cover' }}
											/>
										</div>
									)}
									{showPitchVideo && vacancy.data.team.project.videoLink && (
										<div className={styles.videoContainer}>
											<iframe
												src={`https://www.youtube.com/embed/${vacancy.data.team.project.videoLink}?autoplay=1`}
												title="Project video"
												width="100%"
												height="200"
												style={{ border: 'none', borderRadius: '8px' }}
												onEnded={() => setShowPitchVideo(false)}
											/>
										</div>
									)}
								</Col>
							</Row>

							{/* Vacancy Description */}
							<Space direction="vertical" style={{ width: '100%' }}>
								<div>
									<Text type="secondary" className={styles.fieldLabel}>
										{t('modal.section.vacancyDescription', 'Vacancy description')}
									</Text>
									<Title level={4} style={{ margin: '8px 0' }}>
										{vacancy.data.description}
									</Title>
								</div>
								<div className={styles.vacancyDeadline}>
									<Text type="secondary">
										{t('modal.section.theVacancyIsAcuteBefore', 'The vacancy is acute before')}:{' '}
										{dayjs(vacancy.data.finishedAt).format('LL')}
									</Text>
								</div>
							</Space>

							{/* Equity Promise */}
							{!!vacancy.data.promisePercentage && !!vacancy.data.promiseStep?.name && (
								<Alert
									type="success"
									message={`${t('modal.vacancy.equityPromise', 'Equity Promise')}: ${vacancy.data.promisePercentage}% ${t(
										'modal.section.equityPromiseDescription',
										'of project equity will be allocated upon reaching the required workflow step {step}',
										{ step: vacancy.data.promiseStep.name }
									)}`}
								/>
							)}

							{/* Status Alerts */}
							{vacancy.data.myTeamMemberId ? (
								<Alert
									type="success"
									message={t('modal.vacancy.applied', 'You have already responded to this vacancy')}
								/>
							) : null}

							{!session?.data?.user && (
								<Alert
									type="error"
									message={
										<T
											keyName="modal.vacancy.notAuth"
											defaultValue="Only registered users can respond to this vacancy. Please <register-link>register</register-link> or <signin-link>sign in</signin-link>."
											params={{
												'register-link': (chunks: React.ReactNode) => <a href="/registration">{chunks}</a>,
												'signin-link': (chunks: React.ReactNode) => <a href="/signin">{chunks}</a>,
											}}
										/>
									}
								/>
							)}
						</Space>
					)}
				</Spin>
			</Modal>

			{Boolean(session?.data) && (
				<SpecialitySelectModal
					open={showSpecialitySelectModal}
					onOk={handleSpecialitySelect}
					onCancel={() => setShowSpecialitySelectModal(false)}
				/>
			)}
		</>
	)
}

export default VacancyPreviewModal
