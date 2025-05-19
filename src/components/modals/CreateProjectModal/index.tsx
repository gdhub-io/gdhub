import { useEffect } from 'react'
import { gtmEventTrigger } from '@/helpers/gtm'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { PiRocketDuotone } from '@react-icons/all-files/pi/PiRocketDuotone'
import { useMutation } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Checkbox, Flex, Form, Input, message, Modal, Spin } from 'antd'
import axios from 'axios'
import { useRouter } from 'next/router'
import styles from './style.module.scss'

const CreateProjectModal = ({ open, onCreate, onCancel }: any) => {
	const router = useRouter()
	const [form] = Form.useForm()
	const { t, getLanguage } = useTolgee()

	const {
		mutateAsync: createProject,
		error: createProjectError,
		isLoading: isCreateProcessing,
	} = useMutation((data) => axios.post<prismaClient.Project>('/api/user/project', data))

	useEffect(() => {
		const error = createProjectError as any
		if (error?.response?.data?.message) {
			message.error(error.response?.data?.message)
		}
	}, [createProjectError])

	const handleOk = async () => {
		let data: any

		try {
			data = await form.validateFields()
		} catch (error: any) {
			if (!error.hasOwnProperty('errorFields')) {
				message.error(error.message)
				return
			}
		}

		if (!data) return

		const project = await createProject(data)
		gtmEventTrigger('project_create', { projectId: project.data.id, name: project.data.name })

		router.push('/my/projects/' + project.data.slug)
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
					variant="filled"
					layout="vertical"
					wrapperCol={{ span: 12 }}
					onFinish={() => {}}
					onFinishFailed={() => {}}
					autoComplete="off"
					requiredMark="optional"
					initialValues={{ agree: false }}
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
							placeholder={t('modal.create-project.field.description.placeholder', 'This project about...')}
						/>
					</Form.Item>

					<Form.Item
						name="agree"
						valuePropName="checked"
						wrapperCol={{
							xs: {
								span: 24,
								offset: 0,
							},
						}}
						rules={[
							{
								validator: (_, value) =>
									value
										? Promise.resolve()
										: Promise.reject(
												new Error(t('modal.create-project.field.agree.error', 'Should accept requirements'))
											),
							},
						]}
					>
						<Checkbox className={styles.checkbox}>
							<T
								keyName="modal.create-project.field.agree.label"
								defaultValue="I confirm that I have read and agree to the <a>requirements for game projects published on the gdhub.io platform</a>."
								params={{
									a: (
										<a
											href={
												getLanguage() == 'ru'
													? 'https://gdhub.notion.site/gdhub-io-157dcc9e9c9d805f8bace76c04d0a36b'
													: 'https://gdhub.notion.site/Requirements-for-game-projects-published-on-the-gdhub-io-platform-157dcc9e9c9d80c3ab0ae8d12035dc30'
											}
											target="_blank"
											rel="noreferrer"
											className={styles.link}
										/>
									),
								}}
							/>
						</Checkbox>
					</Form.Item>
				</Form>
			</Spin>
		</Modal>
	)
}

export default CreateProjectModal
