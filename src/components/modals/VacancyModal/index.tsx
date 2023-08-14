import { useEffect, useMemo, useState } from 'react'
import { TeamVacancy, TeamVacancyStatus, WorkDirection } from '@prisma/client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button, Col, DatePicker, Form, Input, message, Modal, Row, Select, Space, Spin } from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'

const VacancyModal = ({ teamId, vacancyId, open, onOk, onCancel }: any) => {
	const [form] = Form.useForm()
	const [processing, setProcessing] = useState(true)

	const { data: workDirections } = useQuery(
		['workDirections'],
		() => axios.get<WorkDirection[]>('/api/dictionary/work-directions'),
		{
			staleTime: Infinity,
		}
	)

	const {
		data: vacancy,
		refetch: fetchVacancy,
		isLoading: isLoadingVacancy,
	} = useQuery(
		['vacancy', vacancyId],
		() => axios.get<TeamVacancy>('/api/user/project/vacancy', { params: { id: vacancyId } }),
		{
			enabled: !!vacancyId,
			staleTime: Infinity,
			onSuccess: ({ data }) => {
				form.setFieldsValue(data)
			},
		}
	)

	const { mutateAsync: createVacancy } = useMutation((data: Record<string, any>) =>
		axios.post('/api/user/project/vacancy', data)
	)
	const { mutateAsync: saveVacancy } = useMutation((params: { id: string; data: Record<string, any> }) =>
		axios.put('/api/user/project/vacancy', params.data, { params: { id: params.id } })
	)

	const directionsOptions = useMemo(() => {
		if (!workDirections) return

		return workDirections.data.map((dir) => ({ value: dir.id, label: dir.name }))
	}, [workDirections])

	// const {
	// 	data: vacancy,
	// 	mutate: fetchVacancy,
	// 	isValidating: isLoadingVacancy,
	// } = useSWR({ url: '/api/vacancy/get', data: { id: vacancyId } }, fetcher, {
	// 	revalidateOnFocus: false,
	// 	isPaused: () => !vacancyId,
	// 	onSuccess: (data) => {
	// 		setProcessing(false)
	// 		form.setFieldsValue({ ...data, finishedAt: dayjs(data.finishedAt) })
	// 	},
	// })

	useEffect(() => {
		if (open && !vacancyId) {
			setProcessing(false)
		}
		if (open && vacancyId) {
			fetchVacancy()
			setProcessing(true)
		}
	}, [open])

	const handleOk = async (asDraft?: { asDraft: boolean }) => {
		try {
			const formData = await form.validateFields()
			setProcessing(true)

			if (vacancyId) {
				await saveVacancy({
					id: vacancyId,
					data: {
						...formData,
						publishedAt: asDraft ? null : dayjs().toISOString(),
						status: asDraft ? TeamVacancyStatus.Draft : TeamVacancyStatus.Published,
						teamId,
					},
				})
			} else {
				await createVacancy({
					...formData,
					publishedAt: asDraft ? null : dayjs().toISOString(),
					status: asDraft ? TeamVacancyStatus.Draft : TeamVacancyStatus.Published,
					teamId,
				})
			}

			// const response: any = await fetch('/api/vacancy/save', {
			// 	method: 'post',
			// 	body: JSON.stringify({
			// 		id: vacancyId || null,
			// 		data: {
			// 			...formData,
			// 			'Published At': asDraft ? null : dayjs().toISOString(),
			// 			'Finished At': formData['Finished At'].format('YYYY-MM-DD'),
			// 			Status: asDraft ? 'Draft' : 'Opened',
			// 			Project: [projectId],
			// 		},
			// 	}),
			// 	headers: {
			// 		'Content-Type': 'application/json',
			// 	},
			// })
			setProcessing(false)

			// if (!response.ok) {
			// 	throw new Error('Что-то пошло не так')
			// }

			// const data = await response.json()

			// if (data.error) {
			// 	throw new Error(response.error.message)
			// }

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

	return (
		<Modal
			centered
			title={vacancyId ? 'Изменить вакансию' : 'Создать новую вакансию'}
			width={800}
			destroyOnClose
			maskClosable={false}
			okText={vacancyId ? 'Сохранить' : 'Опубликовать'}
			open={open}
			onCancel={handleCancel}
			confirmLoading={processing}
			footer={[
				<Space key="form-buttons" wrap>
					<Button key="close" onClick={handleCancel} disabled={processing}>
						Закрыть
					</Button>
					<Button key="draft" disabled={processing} onClick={() => handleOk({ asDraft: true })}>
						Сохранить как черновик
					</Button>
					<Button key="public" disabled={processing} type="primary" onClick={() => handleOk()}>
						Опубликовать
					</Button>
				</Space>,
			]}
		>
			<Spin spinning={processing}>
				<Form
					form={form}
					layout="vertical"
					name="vacancy-form"
					wrapperCol={{ span: 12 }}
					onFinish={() => {}}
					onFinishFailed={() => {}}
					autoComplete="off"
					requiredMark="optional"
					initialValues={{
						teamId,
					}}
				>
					<Row gutter={[16, 16]}>
						<Col flex={1}>
							<Form.Item
								label="Название вакансии"
								name="title"
								rules={[{ required: true }]}
								required
								wrapperCol={{ span: 24 }}
							>
								<Input width={'100%'} placeholder={`Например: Концепт-художник по окружению`} />
							</Form.Item>
						</Col>
						<Col>
							<Form.Item name="finishedAt" label="Актуальна до" rules={[{ required: true }]} wrapperCol={{ span: 24 }}>
								<DatePicker format="DD.MM.YYYY" disabledDate={(current) => current && current < dayjs().endOf('day')} />
							</Form.Item>
						</Col>
					</Row>

					<Form.Item
						name="directionId"
						label="К какому направлению относится данная вакансия"
						wrapperCol={{ span: 24 }}
						rules={[{ required: true }]}
						required
					>
						<Select style={{ width: '100%' }} placeholder={`Например: 2D арт и анимация`} options={directionsOptions} />
					</Form.Item>

					<Form.Item
						name="description"
						label="Описание вакансии"
						help="Опишите требования/пожелания к кандидату, опишите какурю работу ему предстоит делать"
						rules={[{ required: true }]}
						wrapperCol={{ span: 24 }}
					>
						<Input.TextArea
							rows={6}
							placeholder={`Например: Ищу концепт-художника по окружению, который имеет опыт работы на ПК проектах, работает в реалистичном стиле.`}
						/>
					</Form.Item>
				</Form>
			</Spin>
		</Modal>
	)
}

export default VacancyModal
