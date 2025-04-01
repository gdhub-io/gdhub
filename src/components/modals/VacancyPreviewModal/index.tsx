import { useEffect, useState } from 'react'
import { TextWithLineBreak } from '@/components/TextWithLineBreak'
import { hasRole } from '@/helpers/user'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Alert, Descriptions, Form, message, Modal, Spin } from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import styles from './style.module.scss'
import SpecialitySelectModal from '../SpecialitySelectModal'

const VacancyPreviewModal = ({ vacancyId, open, onOk, onCancel }: any) => {
	const session: any = useSession()
	const { t } = useTolgee()
	const router = useRouter()
	const [form] = Form.useForm()
	const [showSpecialitySelectModal, setShowSpecialitySelectModal] = useState(false)

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
							workflow: prismaClient.ProjectWorkflow & { steps: prismaClient.ProjectWorkflowStep[] }
						}
					}
					myTeamMemberId: string
				}
			>('/api/user/project/vacancy', {
				params: { id: vacancyId },
			}),
		{
			enabled: !!vacancyId && !!session?.data,
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

		// if (hasRole(prismaClient.UserRole.Member, session)) {
		return vacancy?.data.myTeamMemberId ? t('Reveal the response') : t('Respond')
		// }
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

	return (
		<>
			<Modal
				centered
				title={
					session?.data ? t('modal.vacancy.titleSession', 'Job vacancy') : t('needAuth', 'Requested authorization')
				}
				width={800}
				destroyOnClose
				maskClosable={false}
				okText={statusOkButton()}
				onOk={functionOkButton}
				// okButtonProps={{ disabled: !session?.data?.user }}
				cancelText={t('close', 'Close')}
				open={open}
				onCancel={handleCancel}
				confirmLoading={processing}
			>
				{!session?.data &&
					t('needAuthDescription', 'Viewing vacancies is available only to authorized lpatform users.')}

				<Spin spinning={processing}>
					{!!vacancy && (
						<>
							<h1>{vacancy.data.title}</h1>

							<Descriptions layout="horizontal" column={1} size="small">
								<Descriptions.Item label={t('Project')}>{vacancy.data.team.project.name}</Descriptions.Item>
								<Descriptions.Item label={t('The vacancy is acute before')}>
									{dayjs(vacancy.data.finishedAt).format('LL')}
								</Descriptions.Item>
							</Descriptions>
							<Descriptions layout="vertical" column={1}>
								<Descriptions.Item className={styles.vacancyDescription} label={t('Vacancy description')}>
									<TextWithLineBreak text={vacancy.data.description} />
								</Descriptions.Item>
							</Descriptions>

							{vacancy.data.promisePercentage && vacancy.data.promiseStep?.name && (
								<Alert
									type="info"
									style={{ marginTop: 16 }}
									message={`${t('modal.vacancy.equityPromise', 'Equity Promise')}: ${vacancy.data.promisePercentage}% ${t(
										'modal.vacancy.equityPromiseDescription',
										'of project equity will be allocated upon reaching the required workflow step {step}',
										{ step: vacancy.data.promiseStep.name }
									)}`}
								/>
							)}

							{vacancy.data.myTeamMemberId ? (
								<Alert
									type="success"
									style={{ marginTop: 16 }}
									message={t('modal.vacancy.applied', 'You have already responded to this vacancy')}
								/>
							) : null}
							{!session?.data?.user && (
								<Alert
									type="error"
									style={{ marginTop: 16 }}
									message={t('modal.vacancy.notAuth', 'Only registered users with a completed specialty can respond.')}
								/>
							)}
						</>
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
