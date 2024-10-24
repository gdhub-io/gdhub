import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Form, Input, message, Modal, Select, Spin } from 'antd'
import axios from 'axios'

const LectureRequestModal = ({ lectureId, open, onOk, onCancel }: any) => {
	const [form] = Form.useForm()
	const { t } = useTolgee()

	const {
		data: lecture,
		refetch: fetchLecture,
		isFetching,
		isPaused,
	} = useQuery(
		['lecture', lectureId],
		() => axios.get<prismaClient.Lecture>('/api/lecture', { params: { id: lectureId } }),
		{
			enabled: !!lectureId,
			onSuccess({ data }) {
				form.setFieldsValue({
					name: data.name,
					wishes: data.wishes,
					directionId: data.directionId,
				})
			},
		}
	)

	const { data: workDirections } = useQuery(
		['workDirections'],
		() => axios.get<prismaClient.WorkDirection[]>('/api/dictionary/work-directions'),
		{
			staleTime: Infinity,
		}
	)

	const { mutateAsync: createLecture } = useMutation((data: Partial<prismaClient.Lecture>) =>
		axios.post<prismaClient.Lecture>('/api/user/lecture', { ...data, stage: prismaClient.LectureStage.Requested })
	)
	const { mutateAsync: updateLecture } = useMutation(
		({ id, data }: { id: string; data: Partial<prismaClient.Lecture> }) =>
			axios.put<prismaClient.Lecture>('/api/user/lecture', data, { params: { id } })
	)

	const workDirectionOptions = workDirections?.data.map((direction) => ({ value: direction.id, label: direction.name }))

	const handleOk = async () => {
		try {
			const formData = await form.validateFields()

			if (lectureId) {
				await updateLecture({ id: lectureId, data: formData })
				message.success(<T key="modal.lectureRequest.lecture-updated-success">Lecture amended</T>)
			} else {
				await createLecture(formData)
				message.success(<T key="modal.lectureRequest.lecture-created-success">Added a new request for a lecture</T>)
			}

			form.resetFields()
			onOk()
		} catch (error: any) {
			message.error(error.message)
		}
	}

	const handleCancel = () => {
		form.resetFields()
		onCancel()
	}

	return (
		<Modal
			centered
			title={lectureId ? <T>Change the lecture request</T> : <T>Request a new lecture</T>}
			width={800}
			destroyOnClose
			maskClosable={false}
			cancelText={<T>Close</T>}
			okText={lectureId ? <T>Save</T> : <T>Publish</T>}
			open={open}
			onOk={handleOk}
			onCancel={handleCancel}
			confirmLoading={isFetching}
		>
			<Spin spinning={isFetching}>
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
					<Form.Item
						label={<T key="modal.lectureRequest.lecture-name">Lecture theme</T>}
						name="name"
						rules={[{ required: true }]}
						required
						wrapperCol={{ span: 24 }}
					>
						<Input
							width={'100%'}
							placeholder={t('modal.lectureRequest.name.placeholder', 'For example: how to analyze the project')}
						/>
					</Form.Item>

					<Form.Item
						name="directionId"
						label={<T key="modal.lectureRequest.work-direction">What direction does this lecture belong</T>}
						wrapperCol={{ span: 24 }}
						rules={[{ required: true }]}
						required
					>
						<Select
							style={{ width: '100%' }}
							placeholder={t('modal.lectureRequest.directionId.placeholder', `For example: Game Design`)}
							options={workDirectionOptions}
						/>
					</Form.Item>

					<Form.Item
						name="wishes"
						label={<T key="modal.lectureRequest.wishes">Wishes for the content of the lecture</T>}
						help={<T key="modal.lectureRequest.wishes-help">So you want to know at this lecture?</T>}
						rules={[{ required: true }]}
						wrapperCol={{ span: 24 }}
					>
						<Input.TextArea
							rows={6}
							placeholder={t(
								'modal.lectureRequest.wishes.placeholder',
								`For example: I want to know how to spend a SWOT analysis and why it is needed`
							)}
						/>
					</Form.Item>
				</Form>
			</Spin>
		</Modal>
	)
}

export default LectureRequestModal
