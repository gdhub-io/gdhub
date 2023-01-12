import { useEffect, useState } from 'react'
import { TextWithLineBreak } from '@components/TextWithLineBreak'
import { fetcher } from '@helpers/fetcher'
import { hasRole } from '@helpers/user'
import { Alert, Descriptions, Form, message, Modal, Spin } from 'antd'
import moment from 'moment'
import { useSession } from 'next-auth/react'
import useSWR from 'swr'
import styles from './style.module.less'
import SpecialitySelectModal from '../SpecialitySelectModal'

const VacancyPreviewModal = ({ project, vacancyId, open, onOk, onCancel }: any) => {
	const session: any = useSession()
	const [form] = Form.useForm()
	const [processing, setProcessing] = useState(true)
	const [showSpecialitySelectModal, setShowSpecialitySelectModal] = useState(false)

	const { data: vacancy, mutate: fetchVacancy } = useSWR(['/api/vacancy/get', { id: vacancyId }], fetcher, {
		revalidateOnFocus: false,
		isPaused: () => !vacancyId,
		onSuccess: (data) => {
			setProcessing(false)
			form.setFieldsValue({ ...data, 'Finished At': moment(data['Finished At']) })
		},
	})

	useEffect(() => {
		if (open && !vacancyId) {
			setProcessing(false)
		}
		if (open && vacancyId) {
			fetchVacancy()
			setProcessing(true)
		}
	}, [open])

	const handleCancel = () => {
		form.resetFields()
		onCancel()
	}

	const handleSpecialitySelect = async (specialityId: any) => {
		try {
			await fetcher('/api/vacancy/apply', {
				specialityId,
				projectId: project.id,
				vacancyId: vacancy.id,
			})

			message.success('Ваш отклик на выранную вакансию отослан')
			setShowSpecialitySelectModal(false)
			setTimeout(onCancel, 600)
		} catch (error: any) {
			console.log(error)
			message.error(error.message)
		}
	}

	const withdrawApply = async (projectMemberId: string) => {
		try {
			await fetcher('/api/vacancy/withdraw', {
				projectMemberId,
			})

			message.success('Ваш отклик отозван')
			onCancel()
		} catch (error: any) {
			console.log(error)
			message.error(error.message)
		}
	}

	const statusOkButton = () => {
		if (hasRole('member', session)) {
			return vacancy?.memberApply ? 'Отозвать отклик' : 'Откликнуться'
		}

		return 'Откликнуться'
	}

	const functionOkButton = () => {
		if (hasRole('member', session)) {
			return vacancy?.memberApply ? withdrawApply(vacancy?.memberApply) : setShowSpecialitySelectModal(true)
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
				okButtonProps={{ disabled: !session.user }}
				cancelText="Закрыть"
				open={open}
				onCancel={handleCancel}
				confirmLoading={processing}
			>
				<Spin spinning={processing}>
					{!!vacancy && (
						<>
							<h1>{vacancy.Name}</h1>

							<Descriptions layout="horizontal" column={1} size="small">
								<Descriptions.Item label="Проект">{project.Name}</Descriptions.Item>
								<Descriptions.Item label="Сезон">{project['Season Name']}</Descriptions.Item>
								<Descriptions.Item label="Вакансия акатуальна до">
									{moment(vacancy['Finished At']).format('DD.MM.YYYY')}
								</Descriptions.Item>
							</Descriptions>
							<Descriptions layout="vertical" column={1}>
								<Descriptions.Item className={styles.vacancyDescription} label="Описание вакансии">
									<TextWithLineBreak text={vacancy.Description} />
								</Descriptions.Item>
							</Descriptions>

							{vacancy.memberApply ? <Alert type="success" message="Вы уже отклинкулись на данную вакансию" /> : null}
							{!session?.user && (
								<Alert
									type="error"
									message="Откликнуться могут только зарегистрированные пользователи с заполненной специальностью"
								/>
							)}
						</>
					)}
				</Spin>
			</Modal>

			{hasRole('member', session) && (
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
