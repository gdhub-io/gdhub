import { useState } from 'react'
import { Lecture, LecturerRequest, WorkDirection } from '@prisma/client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Col, DatePicker, Form, Input, message, Modal, Row, Select, Spin, TimePicker } from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'
import { DateTime } from 'luxon'
import Link from 'next/link'
import { useSession } from 'next-auth/react'

const SetLecturerModal = ({ lectureId, open, onOk, onCancel }: any) => {
	const [form] = Form.useForm()
	const { data: session } = useSession()
	const [speakerRequest, setSpeakerRequest] = useState<LecturerRequest>()

	const { isLoading: isLoadingLecture } = useQuery(
		['lecturer-requestv', lectureId],
		() =>
			axios.get<Lecture & { lecturerRequests: LecturerRequest[] }>('/api/user/lecture', { params: { id: lectureId } }),
		{
			enabled: !!lectureId,
			refetchOnWindowFocus: false,
			refetchOnReconnect: false,
			refetchOnMount: false,
			onSuccess: ({ data }) => {
				form.setFieldsValue({
					name: data.name,
					wishes: data.wishes,
					directionId: data.directionId,
				})

				if (session) {
					const speakerRequest = data.lecturerRequests?.find((r) => r.userId == session.user.id)

					if (speakerRequest) {
						setSpeakerRequest(speakerRequest)

						form.setFieldsValue({
							linkToStream: speakerRequest.linkToStream,
							curriculum: speakerRequest.curriculum,
							date: speakerRequest.date ? dayjs(speakerRequest.date) : undefined,
							time: speakerRequest.date ? dayjs(speakerRequest.date) : undefined,
						})
					}
				}
			},
		}
	)

	const { mutateAsync: createLecturerRequest } = useMutation((data: Partial<LecturerRequest>) =>
		axios.post<any>(`/api/user/lecture/${lectureId}/lecturer`, data)
	)
	const { mutateAsync: updateLecturerRequest } = useMutation(
		({ lecturerRequestId, data }: { lecturerRequestId: string; data: Partial<LecturerRequest> }) =>
			axios.put<any>(`/api/user/lecture/${lectureId}/lecturer/${lecturerRequestId}`, data)
	)

	const { data: workDirections } = useQuery(
		['workDirections'],
		() => axios.get<WorkDirection[]>('/api/dictionary/work-directions'),
		{
			staleTime: Infinity,
		}
	)

	const directionsOptions = workDirections?.data.map((direction) => ({ value: direction.id, label: direction.name }))

	const handleOk = async () => {
		try {
			const formData = await form.validateFields()
			const date = formData.date
				.set('hour', formData.time.hour())
				.set('minute', formData.time ? formData.time?.minute() : 0)
				.set('second', 0)

			if (!!speakerRequest) {
				await updateLecturerRequest({
					lecturerRequestId: speakerRequest.id,
					data: {
						directionId: formData.directionId,
						lectureId,
						curriculum: formData.curriculum,
						linkToStream: formData.linkToStream,
						date: date.toISOString(),
					},
				})

				message.success('Ваше предложение обновлено')
			} else {
				await createLecturerRequest({
					directionId: formData.directionId,
					lectureId,
					curriculum: formData.curriculum,
					linkToStream: formData.linkToStream,
					date: date.toISOString(),
				})

				message.success('Ваше предложение провести лекцию отправлено')
			}

			form.resetFields()

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
			title={'Хочу провести эту лекцию'}
			width={800}
			destroyOnClose
			maskClosable={false}
			cancelText="Закрыть"
			okText={speakerRequest ? 'Сохранить' : 'Предложить'}
			open={open}
			onOk={handleOk}
			onCancel={handleCancel}
			confirmLoading={isLoadingLecture}
		>
			<Spin spinning={isLoadingLecture}>
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
					<Form.Item name="lecturerId" hidden noStyle>
						<Input />
					</Form.Item>

					<Form.Item label="Тема лекции" name="name" rules={[{ required: true }]} required wrapperCol={{ span: 24 }}>
						<Input
							width={'100%'}
							readOnly
							disabled
							style={{ color: '#000', padding: 0, fontWeight: 'bold' }}
							bordered={false}
						/>
					</Form.Item>

					<Form.Item
						name="wishes"
						label="Пожелания по содержанию лекции"
						rules={[{ required: true }]}
						wrapperCol={{ span: 24 }}
					>
						<Input.TextArea rows={4} disabled readOnly style={{ color: '#000' }} />
					</Form.Item>

					<Form.Item
						name="directionId"
						label="К какому направлению относится данная лекция"
						wrapperCol={{ span: 24 }}
						required
					>
						<Select style={{ width: '100%' }} placeholder={`Например: геймдизайн`} options={directionsOptions} />
					</Form.Item>

					<Form.Item
						name="curriculum"
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
								<TimePicker format="HH:mm" minuteStep={15} />
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
						rules={[{ type: 'url' }]}
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
