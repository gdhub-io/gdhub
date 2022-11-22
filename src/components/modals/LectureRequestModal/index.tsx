import { useEffect, useState } from 'react'
import { Form, Input, message, Modal, Select, Spin } from 'antd'

const LectureRequestModal = ({ lectureId, open, onOk, onCancel }: any) => {
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
		} else {
			setProcessing(false)
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
			title={lectureId ? 'Изменить запрос на лекцию' : 'Запросить новую лекцию'}
			width={800}
			destroyOnClose
			maskClosable={false}
			cancelText="Закрыть"
			okText="Сохранить"
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
						name="Wishes"
						label="Пожелания по содержанию лекции"
						help="Чтобы вы хотели узнать на данной лекции?"
						rules={[{ required: true }]}
						wrapperCol={{ span: 24 }}
					>
						<Input.TextArea
							rows={6}
							placeholder={`Например: Хочу узнать как проводить swot-анализ и для чего он нужен`}
						/>
					</Form.Item>
				</Form>
			</Spin>
		</Modal>
	)
}

export default LectureRequestModal
