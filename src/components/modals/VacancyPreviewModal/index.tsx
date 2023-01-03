import { useEffect, useState } from 'react'
import { fetcher } from '@helpers/fetcher'
import { Alert, Descriptions, Form, message, Modal, Spin } from 'antd'
import moment from 'moment'
import useSWR from 'swr'
import styles from './style.module.less'
import SpecialitySelectModal from '../SpecialitySelectModal'

const VacancyPreviewModal = ({ project, vacancyId, open, onOk, onCancel }: any) => {
	const [form] = Form.useForm()
	const [processing, setProcessing] = useState(true)
	const [showSpecialitySelectModal, setShowSpecialitySelectModal] = useState(false)
	const directionsOptions = [
		{
			value: 'Programming',
			label: 'Программирование',
		},
		{
			value: 'Game Design',
			label: 'Геймдизайн',
		},
		{
			value: '2D Art & Animation',
			label: '2D арт и анимация',
		},
		{
			value: '3D Art & Animation',
			label: '3D арт и анимация',
		},
		{
			value: 'Project Management',
			label: 'Управление проектом',
		},
		{
			value: 'Product Management',
			label: 'Управление продуктом',
		},
		{
			value: 'Technical Art',
			label: 'Технический арт',
		},
		{
			value: 'Team Management',
			label: 'Управление командой',
		},
		{
			value: 'Other',
			label: 'Другое',
		},
	]

	const {
		data: vacancy,
		mutate: fetchVacancy,
		isValidating: isLoadingVacancy,
	} = useSWR(['/api/vacancy/get', { id: vacancyId }], fetcher, {
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

	// useEffect(() => {
	// 	if (vacancy) {
	// 		form.setFieldsValue({ ...vacancy, 'Finished At': moment(vacancy['Finished At']) })
	// 	}
	// }, [vacancy])

	const handleOk = async (asDraft?: { asDraft: boolean }) => {
		try {
			const formData = await form.validateFields()
			setProcessing(true)
			const response: any = await fetch('/api/vacancy/save', {
				method: 'post',
				body: JSON.stringify({
					id: vacancyId || null,
					data: {
						...formData,
						'Finished At': formData['Finished At'].format('YYYY-MM-DD'),
						Status: asDraft ? 'Draft' : 'Opened',
						Project: [project?.id],
					},
				}),
				headers: {
					'Content-Type': 'application/json',
				},
			})
			setProcessing(false)

			if (!response.ok) {
				throw new Error('Что-то пошло не так')
			}

			const data = await response.json()

			if (data.error) {
				throw new Error(response.error.message)
			}

			form.resetFields()
			message.success(vacancyId ? 'Вакансия изменена' : 'Добавлена новая вакансия')
			onOk()
		} catch (error: any) {
			setProcessing(false)

			if (!error.hasOwnProperty('errorFields')) {
				message.error(error.message)
			} else {
				message.error('Ошибка. Проверьте, все ли данные введены корректно')
			}
		}
	}

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

	return (
		<>
			<Modal
				centered
				title="Кто требуется"
				width={800}
				destroyOnClose
				maskClosable={false}
				okText={vacancy?.memberApply ? 'Отозвать отклик' : 'Откликнуться'}
				onOk={() => (vacancy?.memberApply ? withdrawApply(vacancy?.memberApply) : setShowSpecialitySelectModal(true))}
				cancelText="Закрыть"
				open={open}
				onCancel={handleCancel}
				confirmLoading={processing}
			>
				<Spin spinning={processing}>
					{!!vacancy && (
						<>
							<h1>{vacancy.Name}</h1>

							<Descriptions layout="horizontal" column={1}>
								<Descriptions.Item label="Проект">{project.Name}</Descriptions.Item>
								<Descriptions.Item label="Сезон">{project['Season Name']}</Descriptions.Item>
								<Descriptions.Item label="Вакансия акатуальна до">
									{moment(vacancy['Finished At']).format('DD.MM.YYYY')}
								</Descriptions.Item>
							</Descriptions>
							<Descriptions layout="vertical" column={1}>
								<Descriptions.Item className={styles.vacancyDescription} label="Описание вакансии">
									{vacancy.Description}
								</Descriptions.Item>
							</Descriptions>

							{vacancy.memberApply ? <Alert type="success" message="Вы уже отклинкулись на данную вакансию" /> : null}
						</>
					)}
				</Spin>
			</Modal>

			<SpecialitySelectModal
				open={showSpecialitySelectModal}
				onOk={handleSpecialitySelect}
				onCancel={() => setShowSpecialitySelectModal(false)}
			/>
		</>
	)
}

export default VacancyPreviewModal
