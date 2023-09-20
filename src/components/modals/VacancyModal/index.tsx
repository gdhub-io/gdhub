import { useEffect } from 'react'
import { useWorkDirections } from '@/hooks/library'
import { TeamVacancy, TeamVacancyStatus } from '@prisma/client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button, Col, DatePicker, Form, Input, message, Modal, Row, Select, Space, Spin } from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'

const VacancyModal = ({ teamId, vacancyId, open, onOk, onCancel }: any) => {
	const [form] = Form.useForm()
	const { options: directionsOptions } = useWorkDirections()

	const {
		data: vacancy,
		refetch: fetchVacancy,
		isFetching: isLoadingVacancy,
	} = useQuery(
		['vacancy', vacancyId],
		() => axios.get<TeamVacancy>('/api/user/project/vacancy', { params: { id: vacancyId } }),
		{
			enabled: !!vacancyId,
			staleTime: Infinity,
			onSuccess: ({ data }) => {
				form.setFieldsValue({ ...data, finishedAt: dayjs(data.finishedAt) })
			},
		}
	)

	const { mutateAsync: createVacancy, isLoading: isCreating } = useMutation((data: Record<string, any>) =>
		axios.post<any>('/api/user/project/vacancy', data)
	)
	const { mutateAsync: saveVacancy, isLoading: isUpdating } = useMutation(
		(params: { id: string; data: Record<string, any> }) =>
			axios.put<any>('/api/user/project/vacancy', params.data, { params: { id: params.id } })
	)

	useEffect(() => {
		if (open && vacancyId) {
			fetchVacancy()
		}
	}, [open])

	const handleOk = async (asDraft?: { asDraft: boolean }) => {
		try {
			const formData = await form.validateFields()

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

			form.resetFields()
			message.success(vacancyId ? 'Вакансия изменена' : 'Добавлена новая вакансия')
			onOk()
		} catch (error: any) {
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
			open={open}
			onCancel={handleCancel}
			confirmLoading={isLoadingVacancy || isUpdating || isCreating}
			footer={[
				<Space key="form-buttons" wrap>
					<Button key="close" onClick={handleCancel} disabled={isLoadingVacancy || isUpdating || isCreating}>
						Закрыть
					</Button>
					<Button
						key="draft"
						disabled={isLoadingVacancy || isUpdating || isCreating}
						onClick={() => handleOk({ asDraft: true })}
					>
						Сохранить как черновик
					</Button>
					<Button
						key="public"
						disabled={isLoadingVacancy || isUpdating || isCreating}
						type="primary"
						onClick={() => handleOk()}
					>
						{vacancy?.data.status == TeamVacancyStatus.Published ? 'Сохранить' : 'Опубликовать'}
					</Button>
				</Space>,
			]}
		>
			<Spin spinning={isLoadingVacancy}>
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
