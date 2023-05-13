import { useState } from 'react'
import { Col, DatePicker, Form, Input, InputNumber, message, Modal, Row, Select, Spin, TimePicker } from 'antd'
import { DateTime } from 'luxon'
import moment from 'moment'
import Link from 'next/link'
import { useSession } from 'next-auth/react'

const PropositionLectureModal = ({ lectureId, open, onOk, onCancel }: any) => {
	const [form] = Form.useForm()
	const { data: session } = useSession()
	const [processing, setProcessing] = useState(false)

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

	const handleOk = async () => {
		try {
			const formData = await form.validateFields()

			setProcessing(true)
			const response: any = await fetch('/api/lecture/save', {
				method: 'post',
				body: JSON.stringify({
					data: {
						Name: formData.Name || undefined,
						Lecturer: session?.user.id,
						Direction: formData.Direction,
						Description: formData.Description,
						Link: formData.Link,
						Duration: formData.Duration.hours() * 60 * 60 + formData.Duration.minutes() * 60,
						Date: formData.Date.set({
							hours: formData.Time.hours(),
							minutes: formData.Time.minutes(),
							seconds: 0,
						}).toISOString(),
					},
				}),
				headers: {
					'Content-Type': 'application/json',
				},
			})
			setProcessing(false)

			if (!response.ok) {
				throw new Error('Something wrong')
			}

			const data = await response.json()

			if (data.error) {
				throw new Error(response.error.message)
			}

			form.resetFields()
			message.success('Предложение лекции создано')
			onOk()
		} catch (error: any) {
			setProcessing(false)

			if (!error.hasOwnProperty('errorFields')) {
				message.error(error?.message)
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
			title={lectureId ? 'Изменить параметы лекции' : 'Хочу провести лекцию'}
			width={800}
			destroyOnClose
			maskClosable={false}
			cancelText="Закрыть"
			okText={lectureId ? 'Сохранить' : 'Опубликовать'}
			open={open}
			onOk={handleOk}
			onCancel={handleCancel}
			confirmLoading={processing}
		>
			<Spin spinning={processing}>
				<Form
					form={form}
					layout="vertical"
					name="lecture-request-form"
					wrapperCol={{ span: 12 }}
					onFinish={() => {}}
					onFinishFailed={() => {}}
					autoComplete="off"
					requiredMark="optional"
					initialValues={{
						Duration: moment().hour(1).minute(0).second(0),
						Date: moment().add(1, 'day'),
						Time: moment().add(2, 'hours').minute(0).second(0),
					}}
				>
					<Form.Item label="Лектор" required wrapperCol={{ span: 24 }}>
						<Input style={{ color: '#666' }} width={'100%'} readOnly disabled value={session?.user.name || ''} />
					</Form.Item>

					<Form.Item label="Тема лекции" name="Name" rules={[{ required: true }]} required wrapperCol={{ span: 24 }}>
						<Input width={'100%'} placeholder={`Например: Как проводить анализ проекта`} />
					</Form.Item>

					<Form.Item
						name="Direction"
						label="К какому направлению относится данная лекция"
						wrapperCol={{ span: 24 }}
						rules={[{ required: true }]}
						required
					>
						<Select style={{ width: '100%' }} placeholder={`Например: геймдизайн`} options={directionsOptions} />
					</Form.Item>

					<Form.Item
						name="Description"
						label="План лекции. О чем планируете рассказывать"
						rules={[{ required: true }]}
						wrapperCol={{ span: 24 }}
					>
						<Input.TextArea rows={8} />
					</Form.Item>

					<Row>
						<Col>
							<Form.Item name="Date" label="Дата проведения" rules={[{ required: true }]} wrapperCol={{ span: 24 }}>
								<DatePicker format="D.M.Y" disabledDate={(current) => current && current < moment().endOf('day')} />
							</Form.Item>
						</Col>
						<Col offset={1}>
							<Form.Item
								name="Time"
								label="Время проведения"
								rules={[{ required: true }]}
								wrapperCol={{ span: 24 }}
								extra={<small>Временная зона {DateTime.now().offsetNameShort}</small>}
							>
								<TimePicker format="HH:mm" minuteStep={30} />
							</Form.Item>
						</Col>
					</Row>

					<Form.Item
						label="Ссылка на лекцию"
						name="Link"
						extra={
							<div>
								Создайте ссылу на трансляцию в{' '}
								<Link href="https://meet.google.com/" target="_blank">
									Google Meet
								</Link>{' '}
								(или на ином сервисе) и вставьте в это поле.
							</div>
						}
						rules={[{ required: true, type: 'url' }]}
						required
						wrapperCol={{ span: 24 }}
					>
						<Input width={'100%'} />
					</Form.Item>

					<Form.Item name="Duration" label="Длительность лекции" rules={[{ required: true }]} wrapperCol={{ span: 24 }}>
						<TimePicker format="HH:mm" minuteStep={10} />
					</Form.Item>

					<Form.Item label="Стоимость" rules={[{ required: true }]} required>
						<InputNumber disabled readOnly min={0} defaultValue={0} onChange={() => {}} /> TON
					</Form.Item>
				</Form>
			</Spin>
		</Modal>
	)
}

export default PropositionLectureModal
