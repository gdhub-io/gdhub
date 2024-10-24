import { useEffect, useRef, useState } from 'react'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { MDXEditorMethods } from '@mdxeditor/editor'
import { useMutation, useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { DatePicker, Form, Input, message, Modal, notification, Spin } from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'
import '@mdxeditor/editor/style.css'
import dynamic from 'next/dynamic'

const ContentEditor = dynamic(() => import('@/components/ContentEditor'), { ssr: false })

const ProjectReportModal = ({ projectId, reportId, open, onOk, onCancel }: any) => {
	const [form] = Form.useForm()
	const { t } = useTolgee()
	const [content, setContent] = useState('')
	const editorRef = useRef<MDXEditorMethods | null>()

	const { refetch: fetchReport, isFetching } = useQuery(
		['project-report', reportId],
		() => axios.get<prismaClient.ProjectReport>('/api/user/project/report', { params: { id: reportId } }),
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
	const { mutateAsync: createProjectReport } = useMutation((data: Omit<Partial<prismaClient.ProjectReport>, 'id'>) =>
		axios.post<void>('/api/user/project/report', data)
	)
	const { mutateAsync: updateProjectReport } = useMutation((data: Partial<prismaClient.ProjectReport>) =>
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
			message.success(reportId ? <T>The report has been changed</T> : <T>A new report has been added</T>)
			onOk()
		} catch (error: any) {
			if (!error.hasOwnProperty('errorFields')) {
				message.error(error.message)
			} else {
				message.error(<T keyName="common.formError">Error. Check if all data is entered correctly</T>)
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
			title={reportId ? <T>Change the report</T> : <T>Add a report</T>}
			width={800}
			destroyOnClose
			maskClosable={false}
			okText={<T>Save</T>}
			cancelText={<T>Close</T>}
			open={open}
			onCancel={handleCancel}
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

					<Form.Item
						name="publishedAt"
						label={<T>Report Date</T>}
						rules={[{ required: true }]}
						wrapperCol={{ span: 24 }}
					>
						<DatePicker format="DD.MM.YYYY" disabledDate={(current) => current > dayjs().endOf('day')} />
					</Form.Item>

					<Form.Item
						name="content"
						label={<T keyName="modal.projectReport.content">What has been made new relative to the past report?</T>}
						required
						rules={[
							{
								validator: () => {
									const value = editorRef.current?.getMarkdown()
									if (!value) {
										notification.error({
											message: <T>This field is required</T>,
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

					<Form.Item name="video" label={<T>Video report</T>} wrapperCol={{ span: 24 }}>
						<Input placeholder={t('Insert ID video from YouTube')} />
					</Form.Item>
				</Form>
			</Spin>
		</Modal>
	)
}

export default ProjectReportModal
