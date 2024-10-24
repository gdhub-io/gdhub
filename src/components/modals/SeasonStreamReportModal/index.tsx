import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { DatePicker, Form, Input, message, Modal, Select, Spin } from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'

const SeasonStreamReportModal = ({ seasonId, streamReportId, open, onOk, onCancel }: any) => {
	const [form] = Form.useForm()

	const { data: seasonStages } = useQuery(['admin', 'seasons'], () =>
		axios.get<prismaClient.SeasonStage[]>(`/api/admin/season/stages`, { params: { seasonId } })
	)

	const { isFetching } = useQuery(
		['season-stream-report', streamReportId],
		() => axios.get(`/api/admin/season/stream-report`, { params: { id: streamReportId } }),
		{
			enabled: !!streamReportId,
			onSuccess({ data }) {
				form.setFieldsValue({
					date: data.date ? dayjs(data.date) : undefined,
					stageId: data.stageId,
				})
			},
		}
	)

	const { mutate: createStreamReport, isLoading: isCreateProcessing } = useMutation(
		(data: any) =>
			axios.post('/api/admin/season/stream-report', { ...data, streamReportId }, { params: { id: streamReportId } }),
		{
			onError(error) {
				message.error('Something wrong. Try later again.')
			},
			onSuccess(data) {
				message.success('New record was added')
				form.resetFields()
				onOk()
			},
		}
	)

	const { mutate: updateStreamReport, isLoading: isSaveProcessing } = useMutation(
		(variables) => axios.put(`/api/admin/season/stream-report`, variables, { params: { id: streamReportId } }),
		{
			onError(error) {
				message.error('Something wrong. Try later again.')
			},
			onSuccess(data) {
				message.success('Record was updated')
				form.resetFields()
				onOk()
			},
		}
	)

	const handleOk = async () => {
		try {
			const data = await form.validateFields()

			const action = streamReportId ? () => updateStreamReport(data) : () => createStreamReport(data)
			await action()
		} catch (error: any) {
			if (!error.hasOwnProperty('errorFields')) {
				message.error(error.message)
			} else {
				message.error('Error. Check if all form data is entered correctly')
			}
		}
	}

	const stagesOptions = seasonStages?.data.map((stage) => ({ label: stage.name, value: stage.id }))

	const handleCancel = () => {
		form.resetFields()
		onCancel()
	}

	return (
		<Modal
			centered
			title={streamReportId ? 'Edit stream date' : 'New stream date'}
			// width={800}
			destroyOnClose
			maskClosable={false}
			okText="Save"
			open={open}
			onOk={handleOk}
			onCancel={handleCancel}
			confirmLoading={isCreateProcessing || isSaveProcessing}
		>
			<Spin spinning={isFetching || isCreateProcessing || isSaveProcessing}>
				<Form
					form={form}
					layout="vertical"
					wrapperCol={{ span: 12 }}
					onFinish={() => {}}
					onFinishFailed={() => {}}
					autoComplete="off"
					requiredMark="optional"
					initialValues={{ stageId: seasonStages?.data.find((s) => s.isCurrent)?.id }}
				>
					<Form.Item name="id" noStyle hidden>
						<Input />
					</Form.Item>

					<Form.Item name="date" label="Date" rules={[{ required: true }]} wrapperCol={{ span: 24 }}>
						<DatePicker format="DD.MM.YYYY HH:mm" showTime={{ format: 'HH:mm' }} />
					</Form.Item>

					<Form.Item name="stageId" label="Stage" rules={[{ required: true }]} wrapperCol={{ span: 24 }}>
						<Select options={stagesOptions} />
					</Form.Item>
				</Form>
			</Spin>
		</Modal>
	)
}

export default SeasonStreamReportModal
