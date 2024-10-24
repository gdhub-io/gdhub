import { useState } from 'react'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Col, DatePicker, Form, Input, message, Modal, Row, Select, Spin, TimePicker } from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'
import Link from 'next/link'
import { useSession } from 'next-auth/react'

const SetLecturerModal = ({ lectureId, open, onOk, onCancel }: any) => {
	const [form] = Form.useForm()
	const { t } = useTolgee()
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
		() => axios.get<prismaClient.WorkDirection[]>('/api/dictionary/work-directions'),
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

				message.success(<T keyName="modal.lecturerRequest.updateSuccess">Your proposal is updated</T>)
			} else {
				await createLecturerRequest({
					directionId: formData.directionId,
					lectureId,
					curriculum: formData.curriculum,
					linkToStream: formData.linkToStream,
					date: date.toISOString(),
				})

				message.success(<T keyName="modal.lecturerRequest.createSuccess">Your proposal to conduct a lecture sent</T>)
			}

			form.resetFields()

			onOk()
		} catch (error: any) {
			if (!error.hasOwnProperty('errorFields')) {
				message.error(error.message)
			} else {
				message.error(<T keyName="form.error">Error. Check if all data is entered correctly</T>)
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
			title={<T keyName="modal.lecturerRequest.title">I want to give this lecture</T>}
			width={800}
			destroyOnClose
			maskClosable={false}
			cancelText={<T>Close</T>}
			okText={speakerRequest ? <T>Save</T> : <T>Offer</T>}
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

					<Form.Item
						label={<T>Lecture theme</T>}
						name="name"
						rules={[{ required: true }]}
						required
						wrapperCol={{ span: 24 }}
					>
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
						label={<T keyName="modal.lecturerRequest.wishes">Wishes for the content of the lecture</T>}
						rules={[{ required: true }]}
						wrapperCol={{ span: 24 }}
					>
						<Input.TextArea rows={4} disabled readOnly style={{ color: '#000' }} />
					</Form.Item>

					<Form.Item
						name="directionId"
						label={<T keyName="modal.lecturerRequest.direction">What direction does this lecture belong</T>}
						wrapperCol={{ span: 24 }}
						required
					>
						<Select style={{ width: '100%' }} placeholder={t('For example: game design')} options={directionsOptions} />
					</Form.Item>

					<Form.Item
						name="curriculum"
						label={<T keyName="modal.lecturerRequest.curriculum">Lecture plan.What are you planning to talk about</T>}
						rules={[{ required: true }]}
						wrapperCol={{ span: 24 }}
					>
						<Input.TextArea rows={8} />
					</Form.Item>

					<Row>
						<Col>
							<Form.Item name="date" label={<T>Date</T>} rules={[{ required: true }]} wrapperCol={{ span: 24 }}>
								<DatePicker format="DD.MM.YYYY" disabledDate={(current) => current && current < dayjs().endOf('day')} />
							</Form.Item>
						</Col>
						<Col offset={1}>
							<Form.Item
								name="time"
								label={<T>Time</T>}
								rules={[{ required: true }]}
								wrapperCol={{ span: 24 }}
								extra={
									<small>
										<T>Time zone</T> {dayjs().tz().offsetName('short')}
									</small>
								}
							>
								<TimePicker format="HH:mm" minuteStep={15} />
							</Form.Item>
						</Col>
					</Row>

					<Form.Item
						label={<T keyName="modal.lecturerRequest.linkToStream">Link to the broadcast</T>}
						name="linkToStream"
						extra={
							<div>
								<T keyName="modal.lecturerRequest.linkToStream.extra.part1">Create a link to a broadcast in</T>{' '}
								<Link href="https://meet.google.com/" target="_blank">
									Google Meet
								</Link>{' '}
								<T keyName="modal.lecturerRequest.linkToStream.extra.part2">
									(or on another service) and insert into this field.
								</T>
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
