import { Project } from '@prisma/client'
import { PiRocketDuotone } from '@react-icons/all-files/pi/PiRocketDuotone'
import { useMutation } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Flex, Form, Input, message, Modal, Spin } from 'antd'
import axios from 'axios'
import { useRouter } from 'next/router'

const CreateProjectModal = ({ open, onCreate, onCancel }: any) => {
	const router = useRouter()
	const [form] = Form.useForm()
	const { t } = useTolgee()

	const { mutateAsync: createProject, isLoading: isCreateProcessing } = useMutation((data) =>
		axios.post<Project>('/api/user/project', data)
	)

	const handleOk = async () => {
		try {
			const data = await form.validateFields()

			const project = await createProject(data)

			router.push('/my/projects/' + project.data.slug)
		} catch (error: any) {
			if (!error.hasOwnProperty('errorFields')) {
				message.error(error.message)
			} else {
				message.error('Error. Check if all form data is entered correctly')
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
			title={
				<Flex align="center" gap={8}>
					<PiRocketDuotone size={32} />
					<T keyName="modal.create-project.title">Create new game project</T>
				</Flex>
			}
			width={640}
			destroyOnClose
			maskClosable={false}
			okText={<T>Create</T>}
			cancelText={<T>Cancel</T>}
			open={open}
			onOk={handleOk}
			onCancel={handleCancel}
			confirmLoading={isCreateProcessing}
		>
			<Spin spinning={isCreateProcessing}>
				<Form
					form={form}
					layout="vertical"
					wrapperCol={{ span: 12 }}
					onFinish={() => {}}
					onFinishFailed={() => {}}
					autoComplete="off"
					requiredMark="optional"
				>
					<Form.Item
						label={<T keyName="modal.create-project.field.name.label">Title</T>}
						name="name"
						rules={[{ required: true }]}
						wrapperCol={{ span: 24 }}
					>
						<Input />
					</Form.Item>

					<Form.Item
						name="description"
						label={<T keyName="modal.create-project.field.description.label">Short Description</T>}
						wrapperCol={{ span: 24 }}
					>
						<Input.TextArea
							rows={6}
							placeholder={t(
								'modal.create-project.field.description.modal.create-project.field.description',
								'This project about...'
							)}
						/>
					</Form.Item>
				</Form>
			</Spin>
		</Modal>
	)
}

export default CreateProjectModal
