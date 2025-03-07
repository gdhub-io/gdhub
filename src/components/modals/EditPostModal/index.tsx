import { useEffect, useRef, useState } from 'react'
import ContentEditor from '@/components/ContentEditor'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { MDXEditorMethods } from '@mdxeditor/editor'
import { AiOutlineVideoCameraAdd } from '@react-icons/all-files/ai/AiOutlineVideoCameraAdd'
import { IoMdClose } from '@react-icons/all-files/io/IoMdClose'
import { TbTrash } from '@react-icons/all-files/tb/TbTrash'
import { useMutation, useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Button, Flex, Form, Input, message, Modal, notification, Popconfirm, Space, Spin, Tooltip } from 'antd'
import axios from 'axios'

const EditPostModal = ({ open, postId, onUpdate, onCancel }: any) => {
	const [form] = Form.useForm()
	const { t } = useTolgee()
	const [showAddVideoInput, setShowAddVideoInput] = useState(false)
	const editorRef = useRef<MDXEditorMethods | null>()
	const [content, setContent] = useState('')

	const { data: report, isLoading } = useQuery(
		['project-report', postId],
		() => axios.get<prismaClient.ProjectReport>('/api/user/project/report', { params: { id: postId } }),
		{ enabled: !!postId }
	)

	const { mutateAsync: editProjectReport, isLoading: isUpdating } = useMutation((data) =>
		axios.put<void>('/api/user/project/report', data)
	)

	useEffect(() => {
		if (!report?.data) return

		setShowAddVideoInput(!!report?.data.video)
		setContent(report?.data.content || '')

		form.setFieldsValue({
			id: report?.data.id,
			content: report?.data.content,
			video: report?.data.video,
		})
	}, [report?.data])

	const handleOk = async () => {
		try {
			const data = await form.validateFields()

			await editProjectReport(data)

			onUpdate()
		} catch (error: any) {
			console.log('error', error)
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

	const { mutateAsync: deleteProjectReport } = useMutation((params: { id: string }) =>
		axios.delete<void>('/api/user/project/report', { params })
	)

	const handleDeleteReport = async (id: string) => {
		form.resetFields()
		setContent('')
		setShowAddVideoInput(false)

		await deleteProjectReport({ id })

		message.success(t('Report was deleted'))

		onUpdate()
	}

	return (
		<Modal
			centered
			title={<T keyName="modal.edit-devlog-post.title">Edit post</T>}
			width={640}
			destroyOnClose
			maskClosable={false}
			okText={<T>Save</T>}
			cancelText={<T>Cancel</T>}
			open={open}
			onOk={handleOk}
			onCancel={handleCancel}
			confirmLoading={isUpdating}
			footer={
				<Flex justify="space-between">
					<Popconfirm
						key={postId}
						title={t('You definitely want to delete this report?')}
						okText={<T>Yes</T>}
						cancelText={<T>No</T>}
						onConfirm={() => handleDeleteReport(postId)}
					>
						<Button icon={<TbTrash size={24} />} type="text" danger style={{ lineHeight: 'initial' }} />
					</Popconfirm>
					<Space size={4}>
						<Button onClick={handleCancel}>
							<T>Cancel</T>
						</Button>
						<Button type="primary" onClick={handleOk}>
							<T>Save</T>
						</Button>
					</Space>
				</Flex>
			}
		>
			<Spin spinning={isLoading || isUpdating}>
				<Form
					form={form}
					variant="filled"
					layout="vertical"
					wrapperCol={{ span: 12 }}
					onFinish={() => {}}
					onFinishFailed={() => {}}
					autoComplete="off"
					requiredMark="optional"
				>
					<Form.Item name="id" rules={[{ required: true }]} noStyle hidden>
						<Input />
					</Form.Item>

					<Space direction="vertical" style={{ width: '100%' }}>
						<Form.Item
							name="content"
							label={<T keyName="modal.devlogwall.newpost.label">What&apos;s new in the project?</T>}
							required
							style={{ margin: 0 }}
							rules={[
								{
									validator: () => {
										const value = editorRef.current?.getMarkdown()
										if (!value) {
											notification.error({
												message: <T keyName="modal.devlogwall.newpost.required">This field is required</T>,
											})
										}
										return value ? Promise.resolve() : Promise.reject()
									},
								},
							]}
							wrapperCol={{ span: 24 }}
						>
							<ContentEditor
								editorRef={editorRef as any}
								markdown={content}
								onChange={(text: string) => form.setFieldValue('content', text)}
							/>
						</Form.Item>

						{!showAddVideoInput && (
							<Tooltip title={<T keyName="devlogwall.form.add-video">Add video</T>}>
								<Button
									className="gray-text-btn"
									onClick={() => setShowAddVideoInput(true)}
									icon={<AiOutlineVideoCameraAdd size={24} />}
									type="text"
								></Button>
							</Tooltip>
						)}

						{!!showAddVideoInput && (
							<>
								<Flex gap={16} align="center">
									<Form.Item name="video" wrapperCol={{ span: 24 }} style={{ margin: 0, width: '100%' }}>
										<Input placeholder={t('Insert video url')} />
									</Form.Item>
									<Button type="text" onClick={() => setShowAddVideoInput(false)} style={{ paddingInline: 8 }}>
										<IoMdClose />
									</Button>
								</Flex>
							</>
						)}
					</Space>
				</Form>
			</Spin>
		</Modal>
	)
}

export default EditPostModal
