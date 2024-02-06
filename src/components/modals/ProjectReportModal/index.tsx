import { useEffect, useRef, useState } from 'react'
import { MDXEditorMethods } from '@mdxeditor/editor'
import { ProjectReport } from '@prisma/client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { DatePicker, Form, Input, message, Modal, notification, Spin } from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'
import '@mdxeditor/editor/style.css'
import dynamic from 'next/dynamic'

const ContentEditor = dynamic(() => import('@/components/ContentEditor'), { ssr: false })

const ProjectReportModal = ({ projectId, reportId, open, onOk, onCancel }: any) => {
	const [form] = Form.useForm()
	const [content, setContent] = useState('')
	const editorRef = useRef<MDXEditorMethods | null>()

	const { refetch: fetchReport, isFetching } = useQuery(
		['project-report', reportId],
		() => axios.get<ProjectReport>('/api/user/project/report', { params: { id: reportId } }),
		{
			enabled: !!reportId,
			onSuccess(data) {
				const { id, publishedAt, content, video } = data.data
				form.setFieldsValue({ reportId: id, content, video, publishedAt: dayjs(publishedAt) })
				setContent(content)
				editorRef.current?.setMarkdown(content.replace('\n', '\n\n'))
			},
			staleTime: Infinity,
		}
	)
	const { mutateAsync: createProjectReport } = useMutation((data: Omit<Partial<ProjectReport>, 'id'>) =>
		axios.post<void>('/api/user/project/report', data)
	)
	const { mutateAsync: updateProjectReport } = useMutation((data: Partial<ProjectReport>) =>
		axios.put<void>('/api/user/project/report', data)
	)

	useEffect(() => {
		if (open && reportId) {
			fetchReport()
		} else {
			setContent('')
		}
	}, [open])

	const handleOk = async () => {
		try {
			const { publishedAt, content, video, projectId } = await form.validateFields()

			if (reportId) {
				await updateProjectReport({
					id: reportId,
					content,
					video,
					publishedAt: publishedAt.toISOString(),
				})
			} else {
				await createProjectReport({
					projectId,
					content,
					video,
					publishedAt: publishedAt.toISOString(),
				})
			}

			form.resetFields()
			message.success(reportId ? 'Отчет изменен' : 'Добавлен новый отчет')
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
			title={reportId ? 'Изменить отчет' : 'Добавить отчет'}
			width={800}
			destroyOnClose
			maskClosable={false}
			okText="Сохранить"
			cancelText="Закрыть"
			open={open}
			onCancel={handleCancel}
			// confirmLoading={isLoading}
			onOk={() => handleOk()}
		>
			<Spin spinning={isFetching}>
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

					<Form.Item name="publishedAt" label="Дата отчета" rules={[{ required: true }]} wrapperCol={{ span: 24 }}>
						<DatePicker format="DD.MM.YYYY" disabledDate={(current) => current > dayjs().endOf('day')} />
					</Form.Item>

					<Form.Item
						name="content"
						label="Что было сделано нового относительно прошлого отчета?"
						required
						rules={[
							{
								validator: () => {
									const value = editorRef.current?.getMarkdown()
									if (!value) {
										notification.error({
											message: 'Это поле обязательно для заполнения',
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

						{/* <Input.TextArea
							rows={10}
							maxLength={1000}
							showCount
							placeholder={`Например:\n1. Добавлена механика ближнего боя\n2. Изменен дизайн босса\n...`}
						/> */}
					</Form.Item>

					<Form.Item name="video" label="Видео-отчет" wrapperCol={{ span: 24 }}>
						<Input placeholder="Вставьте ID видео из Youtube" />
					</Form.Item>
				</Form>
			</Spin>
		</Modal>
	)
}

export default ProjectReportModal
