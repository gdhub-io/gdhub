import { useEffect, useState } from 'react'
import { Col, DatePicker, Form, Input, message, Modal, Row, Select, Spin, TimePicker } from 'antd'
import { DateTime } from 'luxon'
import moment from 'moment'

const SetLecturerModal = ({ lectureId, open, onOk, onCancel }: any) => {
	const [form] = Form.useForm()
	const [processing, setProcessing] = useState(true)
	const [lecture, setLectureId] = useState<any>()

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

	useEffect(() => {
		if (open && lectureId) {
			getLecture(lectureId)
		}
	}, [open])

	useEffect(() => {
		if (lecture) {
			form.setFieldsValue({ ...lecture, Season: lecture.Season[0] })
		}
	}, [lecture])

	const getLecture = async (lectureId: string) => {
		try {
			setProcessing(true)

			const response: any = await fetch('/api/lecture/get', {
				method: 'post',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: lectureId,
				}),
			})

			if (response.error) {
				throw new Error(response.error.message)
			}

			const data = await response.json()

			form.setFieldsValue({
				Name: data.Name,
				Wishes: data.Wishes,
				Direction: data.Direction,
			})
			setProcessing(false)
		} catch (error: any) {
			console.log('getlecture', error)
			message.error(error.message)
			setProcessing(false)
		}
	}

	const handleOk = async () => {
		try {
			const formData = await form.validateFields()
			setProcessing(true)
			const response: any = await fetch('/api/lecture/save', {
				method: 'post',
				body: JSON.stringify({ id: lectureId || null, data: formData }),
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
			message.success(lectureId ? 'Данные идеи обновлены' : 'Добавлена новая идея игры')
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
		setLectureId(null)
		form.resetFields()
		onCancel()
	}

	return (
		<Modal
			centered
			title={'Хочу провести эту лекцию'}
			width={800}
			destroyOnClose
			maskClosable={false}
			cancelText="Закрыть"
			okText="Опубликовать"
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
				>
					<Form.Item label="Тема лекции" name="Name" rules={[{ required: true }]} required wrapperCol={{ span: 24 }}>
						<Input
							width={'100%'}
							placeholder={`Например: Как проводить анализ проекта`}
							readOnly
							disabled
							style={{ color: '#000', padding: 0, fontWeight: 'bold' }}
							bordered={false}
						/>
					</Form.Item>

					<Form.Item
						name="Wishes"
						label="Пожелания по содержанию лекции"
						rules={[{ required: true }]}
						wrapperCol={{ span: 24 }}
					>
						<Input.TextArea rows={4} disabled readOnly style={{ color: '#000' }} />
					</Form.Item>

					<Form.Item
						name="Direction"
						label="К какому направлению относится данная лекция"
						wrapperCol={{ span: 24 }}
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
								<DatePicker
									defaultValue={moment().add(1, 'day')}
									format="D.M.Y"
									disabledDate={(current) => current && current < moment().endOf('day')}
								/>
							</Form.Item>
						</Col>
						<Col offset={1}>
							<Form.Item
								name="Date"
								label="Время проведения"
								rules={[{ required: true }]}
								wrapperCol={{ span: 24 }}
								extra={<small>Временная зона {DateTime.now().offsetNameShort}</small>}
							>
								<TimePicker defaultValue={moment()} format="HH:mm" minuteStep={30} />
							</Form.Item>
						</Col>
					</Row>

					<Form.Item
						label="Ссылка на лекцию"
						name="Link"
						help="Укажите сылку на трансляцию в Zoom, Google Meets, видеочат в Telegram и т.п."
						rules={[{ required: true }]}
						required
						wrapperCol={{ span: 24 }}
					>
						<Input width={'100%'} />
					</Form.Item>
				</Form>
			</Spin>
		</Modal>
	)
}

export default SetLecturerModal
