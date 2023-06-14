import { useEffect, useState } from 'react'
import { Button, Col, DatePicker, Form, Input, message, Modal, Row, Select, Space, Spin } from 'antd'
import moment from 'moment'
import useSWR from 'swr'
import { fetcher } from '@/helpers/fetcher'

const VacancyModal = ({ projectId, projectName, vacancyId, open, onOk, onCancel }: any) => {
	const [form] = Form.useForm()
	const [processing, setProcessing] = useState(true)
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
	} = useSWR({ url: '/api/vacancy/get', data: { id: vacancyId } }, fetcher, {
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
						'Published At': asDraft ? null : moment().toISOString(),
						'Finished At': formData['Finished At'].format('YYYY-MM-DD'),
						Status: asDraft ? 'Draft' : 'Opened',
						Project: [projectId],
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
						Project: projectId,
					}}
				>
					<Row gutter={[16, 16]}>
						<Col flex={1}>
							<Form.Item
								label="Название вакансии"
								name="Name"
								rules={[{ required: true }]}
								required
								wrapperCol={{ span: 24 }}
							>
								<Input width={'100%'} placeholder={`Например: Концепт-художник по окружению`} />
							</Form.Item>
						</Col>
						<Col>
							<Form.Item name="Finished At" label="Актуальна до" rules={[{ required: true }]} wrapperCol={{ span: 24 }}>
								<DatePicker format="D.M.Y" disabledDate={(current) => current && current < moment().endOf('day')} />
							</Form.Item>
						</Col>
					</Row>

					<Form.Item hidden name="Project" label="Проект" wrapperCol={{ span: 24 }} required>
						<Select disabled style={{ width: '100%' }} options={[{ value: projectId, label: projectName }]} />
					</Form.Item>

					<Form.Item
						name="Direction"
						label="К какому направлению относится данная вакансия"
						wrapperCol={{ span: 24 }}
						rules={[{ required: true }]}
						required
					>
						<Select style={{ width: '100%' }} placeholder={`Например: 2D арт и анимация`} options={directionsOptions} />
					</Form.Item>

					<Form.Item
						name="Description"
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
