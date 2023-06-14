import { useEffect, useState } from 'react'
import { DatePicker, Form, Input, message, Modal, Spin } from 'antd'
import moment from 'moment'
import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'
import { fetcher, fetherForMutation } from '@/helpers/fetcher'

const ProjectReportModal = ({ projectId, reportId, open, onOk, onCancel }: any) => {
	const [form] = Form.useForm()
	const [processing, setProcessing] = useState(true)
	const { trigger: saveProjectReport } = useSWRMutation('/api/project-report/save', fetherForMutation)

	const { mutate: fetchReport } = useSWR({ url: '/api/project-report/get', data: { id: reportId } }, fetcher, {
		revalidateOnFocus: false,
		isPaused: () => !reportId,
		onSuccess: (data) => {
			setProcessing(false)
			form.setFieldsValue({ ...data, reportId: data.id, Date: moment(data.Date) })
		},
	})

	useEffect(() => {
		if (open && !reportId) {
			setProcessing(false)
		}
		if (open && reportId) {
			fetchReport()
			setProcessing(true)
		}
	}, [open])

	const handleOk = async () => {
		try {
			const formData = await form.validateFields()
			setProcessing(true)
			const data = await saveProjectReport({ ...formData, id: reportId, Date: formData.Date.toISOString() })
			setProcessing(false)

			if (!data || data.error) throw new Error(data?.error || 'Что-то пошло не так')

			form.resetFields()
			message.success(reportId ? 'Отчет изменен' : 'Добавлен новый отчет')
			onOk()
		} catch (error: any) {
			setProcessing(false)
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
			confirmLoading={processing}
			onOk={() => handleOk()}
		>
			<Spin spinning={processing}>
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
						Project: projectId,
						Date: moment(),
					}}
				>
					<Form.Item name="Project" rules={[{ required: true }]} noStyle hidden>
						<Input />
					</Form.Item>

					<Form.Item name="Date" label="Дата отчета" rules={[{ required: true }]} wrapperCol={{ span: 24 }}>
						<DatePicker format="DD.MM.YYYY" disabledDate={(current) => current > moment().endOf('day')} />
					</Form.Item>

					<Form.Item
						name="Content"
						label="Что было сделано нового относительно прошлого отчета?"
						rules={[{ required: true }]}
						wrapperCol={{ span: 24 }}
					>
						<Input.TextArea
							rows={10}
							maxLength={1000}
							showCount
							placeholder={`Например:\n1. Добавлена механика ближнего боя\n2. Изменен дизайн босса\n...`}
						/>
					</Form.Item>

					<Form.Item name="Youtube Video ID" label="Видео-отчет" wrapperCol={{ span: 24 }}>
						<Input placeholder="Вставьте ID видео из Youtube" />
					</Form.Item>
				</Form>
			</Spin>
		</Modal>
	)
}

export default ProjectReportModal
