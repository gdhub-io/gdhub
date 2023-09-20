import { Lecture, LectureStage, WorkDirection } from '@prisma/client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Col, DatePicker, Form, Input, message, Modal, Row, Select, Spin, TimePicker } from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'
import { DateTime } from 'luxon'
import Link from 'next/link'
import { useSession } from 'next-auth/react'

const PropositionLectureModal = ({ lectureId, open, onOk, onCancel }: any) => {
	const [form] = Form.useForm()
	const { data: session } = useSession()

	const { data: workDirections } = useQuery(
		['workDirections'],
		() => axios.get<WorkDirection[]>('/api/dictionary/work-directions'),
		{
			staleTime: Infinity,
		}
	)
	const { mutateAsync: createLecture, isLoading: isCreating } = useMutation((data: Partial<Lecture>) =>
		axios.post<Lecture>('/api/user/lecture', { ...data, stage: LectureStage.Proposed })
	)
	const { mutateAsync: updateLecture, isLoading: isUpdating } = useMutation(
		({ id, data }: { id: string; data: Partial<Lecture> }) =>
			axios.put<Lecture>('/api/user/lecture', data, { params: { id } })
	)

	const directionsOptions = workDirections?.data.map((direction) => ({ value: direction.id, label: direction.name }))

	// const directionsOptions = [
	// 	{
	// 		value: 'Programming',
	// 		label: 'Программирование',
	// 	},
	// 	{
	// 		value: 'Game Design',
	// 		label: 'Геймдизайн',
	// 	},
	// 	{
	// 		value: '2D Art & Animation',
	// 		label: '2D арт и анимация',
	// 	},
	// 	{
	// 		value: '3D Art & Animation',
	// 		label: '3D арт и анимация',
	// 	},
	// 	{
	// 		value: 'Project Management',
	// 		label: 'Управление проектом',
	// 	},
	// 	{
	// 		value: 'Product Management',
	// 		label: 'Управление продуктом',
	// 	},
	// 	{
	// 		value: 'Technical Art',
	// 		label: 'Технический арт',
	// 	},
	// 	{
	// 		value: 'Team Management',
	// 		label: 'Управление командой',
	// 	},
	// 	{
	// 		value: 'Other',
	// 		label: 'Другое',
	// 	},
	// ]

	const handleOk = async () => {
		try {
			const { name, lecturerId, directionId, description, linkToStream, date, time, duration } =
				await form.validateFields()

			const newData: Partial<Lecture> = {
				name,
				directionId,
				description,
				linkToStream,
				date: date
					.set({
						hours: time.hour(),
						minutes: time.minute(),
						seconds: 0,
					})
					.toISOString(),
				duration: duration.hour() * 60 * 60 + duration.minute() * 60,
				wishes: null,
			}

			if (lectureId) {
				await updateLecture({ id: lectureId, data: newData })
				message.success('Предложение лекции создано')
			} else {
				await createLecture(newData)
				message.success('Предложение лекции обновлено')
			}

			form.resetFields()
			onOk()
		} catch (error: any) {
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
			confirmLoading={isCreating || isUpdating}
		>
			<Spin spinning={isCreating || isUpdating}>
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
						lecturerId: session?.user.id,
						duration: dayjs().hour(1).minute(0).second(0),
						date: dayjs().add(1, 'day'),
						time: dayjs().add(2, 'hours').minute(0).second(0),
					}}
				>
					<Form.Item name="lecturerId" required hidden noStyle>
						<Input />
					</Form.Item>
					<Form.Item label="Лектор" required wrapperCol={{ span: 24 }}>
						<Input style={{ color: '#666' }} width={'100%'} readOnly disabled value={session?.user.name || ''} />
					</Form.Item>

					<Form.Item label="Тема лекции" name="name" rules={[{ required: true }]} required wrapperCol={{ span: 24 }}>
						<Input width={'100%'} placeholder={`Например: Как проводить анализ проекта`} />
					</Form.Item>

					<Form.Item
						name="directionId"
						label="К какому направлению относится данная лекция"
						wrapperCol={{ span: 24 }}
						rules={[{ required: true }]}
						required
					>
						<Select style={{ width: '100%' }} placeholder={`Например: геймдизайн`} options={directionsOptions} />
					</Form.Item>

					<Form.Item
						name="description"
						label="План лекции. О чем планируете рассказывать"
						rules={[{ required: true }]}
						wrapperCol={{ span: 24 }}
					>
						<Input.TextArea rows={8} />
					</Form.Item>

					<Row>
						<Col>
							<Form.Item name="date" label="Дата проведения" rules={[{ required: true }]} wrapperCol={{ span: 24 }}>
								<DatePicker format="DD.MM.YYYY" disabledDate={(current) => current && current < dayjs().endOf('day')} />
							</Form.Item>
						</Col>
						<Col offset={1}>
							<Form.Item
								name="time"
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
						name="linkToStream"
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

					<Form.Item name="duration" label="Длительность лекции" rules={[{ required: true }]} wrapperCol={{ span: 24 }}>
						<TimePicker format="HH:mm" minuteStep={10} />
					</Form.Item>
				</Form>
			</Spin>
		</Modal>
	)
}

export default PropositionLectureModal
