import { useRef, useState } from 'react'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { MDXEditorMethods } from '@mdxeditor/editor'
import { IoMdClose } from '@react-icons/all-files/io/IoMdClose'
import { useMutation } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Button, Card, Flex, Form, Input, Space, message, notification } from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'
import '@mdxeditor/editor/style.css'
import dynamic from 'next/dynamic'

const ContentEditor = dynamic(() => import('@/components/ContentEditor'), { ssr: false })

export const PostForm = ({ projectId, onCreate = () => {} }: any) => {
	const [form] = Form.useForm()
	const { t } = useTolgee()
	const [content, setContent] = useState('')
	const [showAddVideoInput, setShowAddVideoInput] = useState(false)
	const editorRef = useRef<MDXEditorMethods | null>()

	const { mutateAsync: createProjectReport, isLoading } = useMutation(
		(data: Omit<Partial<prismaClient.ProjectReport>, 'id'>) => axios.post<void>('/api/user/project/report', data),
		{
			onSuccess: () => {
				onCreate()
			},
		}
	)

	const handleOk = async () => {
		try {
			const { content, video, projectId } = await form.validateFields()

			if (!content?.length) {
				message.warning(t('The post can not be empty'))
				return
			}

			await createProjectReport({
				projectId,
				content,
				video,
				publishedAt: dayjs().toDate(),
			})

			form.resetFields()
		} catch (error: any) {
			if (!error.hasOwnProperty('errorFields')) {
				message.error(error.message)
			} else {
				message.error('Error. Check if all data is entered correctly')
			}
		}
	}

	return (
		<Card>
			<Form
				form={form}
				layout="vertical"
				name="report-form"
				wrapperCol={{ span: 12 }}
				onFinish={() => {}}
				onFinishFailed={() => {}}
				autoComplete="off"
				requiredMark="optional"
				initialValues={{
					projectId,
					publishedAt: dayjs(),
				}}
			>
				<Form.Item name="projectId" rules={[{ required: true }]} noStyle hidden>
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
						<Flex justify="space-between">
							<Button className="gray-btn" onClick={() => setShowAddVideoInput(true)}>
								Add Youtube video
							</Button>

							<Button type="primary" onClick={handleOk} loading={isLoading}>
								<T keyName="modal.devlogwall.newpost.postBtn.label">Post</T>
							</Button>
						</Flex>
					)}

					{!!showAddVideoInput && (
						<>
							<Flex gap={16} align="center">
								<Form.Item name="video" wrapperCol={{ span: 24 }} style={{ margin: 0, width: '100%' }}>
									<Input placeholder={t('Insert ID video from YouTube')} />
								</Form.Item>
								<Button type="text" onClick={() => setShowAddVideoInput(false)} style={{ paddingInline: 8 }}>
									<IoMdClose />
								</Button>
							</Flex>
							<Flex justify="end">
								<Button type="primary" onClick={handleOk} loading={isLoading}>
									<T keyName="modal.devlogwall.newpost.postBtn.label">Post</T>
								</Button>
							</Flex>
						</>
					)}
				</Space>
			</Form>
		</Card>
	)
}
