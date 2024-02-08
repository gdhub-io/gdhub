import { useEffect, useState } from 'react'
import { TextWithLineBreak } from '@/components/TextWithLineBreak'
import { hasRole } from '@/helpers/user'
import { Season, SeasonStage, TeamVacancy, UserRole } from '@prisma/client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { T } from '@tolgee/react'
import { Alert, Descriptions, Form, message, Modal, Spin } from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import styles from './style.module.scss'
import SpecialitySelectModal from '../SpecialitySelectModal'

const VacancyPreviewModal = ({ vacancyId, open, onOk, onCancel }: any) => {
	const session: any = useSession()
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
				TeamVacancy & {
					project: { id: string; slug: string; name: string; stage: SeasonStage & { season: Season } }
					myTeamMemberId: string
				}
			>('/api/user/project/vacancy', {
				params: { id: vacancyId },
			}),
		{
			enabled: !!vacancyId && !!session?.data,
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

			message.success('Ваш отклик на выранную вакансию отослан')
			setShowSpecialitySelectModal(false)
			setTimeout(onCancel, 600)
		} catch (error: any) {
			console.log(error)
			message.error(error.message)
		}
	}

	const withdrawApplyHandler = async (data: { teamMemberId: string }) => {
		try {
			await withdrawApply(data)

			message.success('Ваш отклик отозван')
			onCancel()
		} catch (error: any) {
			console.log(error)
			message.error(error.message)
		}
	}

	const statusOkButton = () => {
		if (!session?.data) {
			return <T keyName="signin">Signin</T>
		}

		if (hasRole(UserRole.Member, session)) {
			return vacancy?.data.myTeamMemberId ? 'Отозвать отклик' : 'Откликнуться'
		}

		return 'Откликнуться'
	}

	const functionOkButton = async () => {
		if (!session?.data) {
			router.push('/signin?callbackUrl=' + router.asPath)
		}

		if (hasRole(UserRole.Member, session)) {
			return vacancy?.data.myTeamMemberId
				? withdrawApplyHandler({ teamMemberId: vacancy.data.myTeamMemberId })
				: setShowSpecialitySelectModal(true)
		}

		return null
	}

	return (
		<>
			<Modal
				centered
				title={
					session?.data ? (
						<T keyName="modal.vacancy.titleSession">Вакансия</T>
					) : (
						<T keyName="needAuth">Необходима авторизация</T>
					)
				}
				width={800}
				destroyOnClose
				maskClosable={false}
				okText={statusOkButton()}
				onOk={functionOkButton}
				// okButtonProps={{ disabled: !session?.data?.user }}
				cancelText={<T keyName="close">Close</T>}
				open={open}
				onCancel={handleCancel}
				confirmLoading={processing}
			>
				{!session?.data && (
					<T keyName="needAuthDescription">Просмотр вакансий доступен только авторизованным пользователям лпатформы.</T>
				)}

				<Spin spinning={processing}>
					{!!vacancy && (
						<>
							<h1>{vacancy.data.title}</h1>

							<Descriptions layout="horizontal" column={1} size="small">
								<Descriptions.Item label="Проект">{vacancy.data.project.name}</Descriptions.Item>
								<Descriptions.Item label="Пайплайн">{vacancy.data.project.stage.season.name}</Descriptions.Item>
								<Descriptions.Item label="Вакансия акатуальна до">
									{dayjs(vacancy.data.finishedAt).format('LL')}
								</Descriptions.Item>
							</Descriptions>
							<Descriptions layout="vertical" column={1}>
								<Descriptions.Item className={styles.vacancyDescription} label="Описание вакансии">
									<TextWithLineBreak text={vacancy.data.description} />
								</Descriptions.Item>
							</Descriptions>

							{vacancy.data.myTeamMemberId ? (
								<Alert
									type="success"
									message="Вы уже откликнулись на данную вакансию. Автор проекта должен связаться с вами в ближайшее время."
								/>
							) : null}
							{!session?.data?.user && (
								<Alert
									type="error"
									message="Откликнуться могут только зарегистрированные пользователи с заполненной специальностью"
								/>
							)}
						</>
					)}
				</Spin>
			</Modal>

			{hasRole(UserRole.Member, session) && (
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
