import { useEffect } from 'react'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslate } from '@tolgee/react'
import { Form, Input, message, Modal, Select, Spin } from 'antd'
import axios from 'axios'

const LectureRequestModal = ({ lectureId, open, onOk, onCancel }: any) => {
	const [form] = Form.useForm()
	const { t } = useTranslate()

	const {
		data: lecture,
		refetch: fetchLecture,
		isFetching,
		isPaused,
	} = useQuery({
		queryKey: ['lecture', lectureId],
		queryFn: () => axios.get<prismaClient.Lecture>('/api/lecture', { params: { id: lectureId } }),
		enabled: !!lectureId,
	})

	useEffect(() => {
		if (!lecture?.data) return

		form.setFieldsValue({
			name: lecture.data.name,
			wishes: lecture.data.wishes,
			directionId: lecture.data.directionId,
		})
	}, [lecture?.data])

	const { data: workDirections } = useQuery({
		queryKey: ['workDirections'],
		queryFn: () => axios.get<prismaClient.WorkDirection[]>('/api/dictionary/work-directions'),
		staleTime: Infinity,
	})

	const { mutateAsync: createLecture } = useMutation({
		mutationFn: (data: Partial<prismaClient.Lecture>) =>
			axios.post<prismaClient.Lecture>('/api/user/lecture', { ...data, stage: prismaClient.LectureStage.Requested }),
	})

	const { mutateAsync: updateLecture } = useMutation({
		mutationFn: ({ id, data }: { id: string; data: Partial<prismaClient.Lecture> }) =>
			axios.put<prismaClient.Lecture>('/api/user/lecture', data, { params: { id } }),
	})

	const workDirectionOptions = workDirections?.data.map((direction) => ({ value: direction.id, label: direction.name }))

	const handleOk = async () => {
		try {
			const formData = await form.validateFields()

			if (lectureId) {
				await updateLecture({ id: lectureId, data: formData })
				message.success(t('modal.lectureRequest.lectureUpdatedSuccess', 'Lecture amended'))
			} else {
				await createLecture(formData)
				message.success(t('modal.lectureRequest.lectureCreatedSuccess', 'Added a new request for a lecture'))
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
			title={
				lectureId
					? t('modal.lectureRequest.changeLectureRequest', 'Change the lecture request')
					: t('modal.lectureRequest.requestNewLecture', 'Request a new lecture')
			}
			width={800}
			destroyOnHidden
			maskClosable={false}
			cancelText={t('modal.lectureRequest.close', 'Close')}
			okText={lectureId ? t('modal.lectureRequest.save', 'Save') : t('modal.lectureRequest.publish', 'Publish')}
			open={open}
			onOk={handleOk}
			onCancel={handleCancel}
			confirmLoading={isFetching}
		>
			<Spin spinning={isFetching}>
				<Form
					form={form}
					variant="filled"
					layout="vertical"
					name="lecture-request-form"
					wrapperCol={{ span: 12 }}
					onFinish={() => {}}
					onFinishFailed={() => {}}
					autoComplete="off"
					requiredMark="optional"
				>
					<Form.Item
						label={t('modal.lectureRequest.lectureTheme', 'Lecture theme')}
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
						label={t('modal.lectureRequest.workDirection', 'What direction does this lecture belong')}
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
						label={t('modal.lectureRequest.wishes', 'Wishes for the content of the lecture')}
						help={t('modal.lectureRequest.wishesHelp', 'So you want to know at this lecture?')}
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
