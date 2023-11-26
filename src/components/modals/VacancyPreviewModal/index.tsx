import { useEffect, useState } from 'react'
import { TextWithLineBreak } from '@/components/TextWithLineBreak'
import { hasRole } from '@/helpers/user'
import { Season, SeasonStage, TeamVacancy, UserRole } from '@prisma/client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Alert, Descriptions, Form, message, Modal, Spin } from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'
import { useSession } from 'next-auth/react'
import styles from './style.module.scss'
import SpecialitySelectModal from '../SpecialitySelectModal'

const VacancyPreviewModal = ({ vacancyId, open, onOk, onCancel }: any) => {
	const session: any = useSession()
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
			>('/api/vacancy', {
				params: { id: vacancyId },
			}),
		{
			enabled: !!vacancyId,
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
		if (open && vacancyId) {
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
		if (hasRole(UserRole.Member, session)) {
			return vacancy?.data.myTeamMemberId ? 'Отозвать отклик' : 'Откликнуться'
		}

		return 'Откликнуться'
	}

	const functionOkButton = () => {
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
				title="Кто требуется"
				width={800}
				destroyOnClose
				maskClosable={false}
				okText={statusOkButton()}
				onOk={functionOkButton}
				okButtonProps={{ disabled: !session?.data?.user }}
				cancelText="Закрыть"
				open={open}
				onCancel={handleCancel}
				confirmLoading={processing}
			>
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
