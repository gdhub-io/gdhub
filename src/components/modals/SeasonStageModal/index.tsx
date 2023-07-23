import { useMutation, useQuery } from '@tanstack/react-query'
import { Col, DatePicker, Form, Input, InputNumber, message, Modal, Row, Spin, Switch } from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'

const StageStageModal = ({ seasonId, stageId, open, onOk, onCancel }: any) => {
	const [form] = Form.useForm()
	const { isLoading: isLoading } = useQuery(
		['seasonStage', stageId],
		() => axios.get(`/api/admin/season/stage`, { params: { id: stageId } }),
		{
			enabled: !!stageId,
			onSuccess({ data }) {
				form.setFieldsValue({
					...data,
					startedAt: data.startedAt ? dayjs(data.startedAt) : undefined,
					finishedAt: data.finishedAt ? dayjs(data.finishedAt) : undefined,
				})
			},
		}
	)
	const { mutate: createStage, isLoading: isCreateProcessing } = useMutation(
		(data: any) => axios.post('/api/admin/season/stage', { ...data, seasonId }, { params: { id: stageId } }),
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
	const { mutate: updateStage, isLoading: isSaveProcessing } = useMutation(
		(variables) => axios.put(`/api/admin/season/stage`, variables, { params: { id: stageId } }),
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

			const action = stageId ? () => updateStage(data) : () => createStage(data)
			await action()
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
			title={stageId ? 'Edit stage' : 'New stage'}
			width={800}
			destroyOnClose
			maskClosable={false}
			okText="Save"
			open={open}
			onOk={handleOk}
			onCancel={handleCancel}
			confirmLoading={isCreateProcessing || isSaveProcessing}
		>
			<Spin spinning={isLoading || isCreateProcessing || isSaveProcessing}>
				<Form
					form={form}
					layout="vertical"
					wrapperCol={{ span: 12 }}
					onFinish={() => {}}
					onFinishFailed={() => {}}
					autoComplete="off"
					requiredMark="optional"
					initialValues={{ isCurrent: false }}
				>
					<Form.Item name="id" noStyle hidden>
						<Input />
					</Form.Item>

					<Row gutter={[16, 16]} align="middle">
						<Col flex={1} xs={{ span: 24 }} md={{ span: 17 }}>
							<Form.Item label="Title" name="name" rules={[{ required: true }]} wrapperCol={{ span: 24 }}>
								<Input size="large" />
							</Form.Item>
						</Col>
						<Col xs={{ span: 12 }} md={{ span: 3 }}>
							<Form.Item label="Order" name="order" rules={[{ required: true }]} wrapperCol={{ span: 24 }}>
								<InputNumber />
							</Form.Item>
						</Col>
						<Col xs={{ span: 12 }} md={{ span: 4 }}>
							<Form.Item
								name="isCurrent"
								label="Is current"
								wrapperCol={{ span: 24 }}
								rules={[{ required: true }]}
								valuePropName="checked"
							>
								<Switch />
							</Form.Item>
						</Col>
					</Row>

					<Row gutter={[16, 16]}>
						<Col xs={{ span: 24 }} md={{ span: 8 }}>
							<Form.Item name="startedAt" label="Started at" rules={[{ required: true }]} wrapperCol={{ span: 24 }}>
								<DatePicker format="DD.MM.YYYY" />
							</Form.Item>
						</Col>
						<Col xs={{ span: 24 }} md={{ span: 8 }}>
							<Form.Item name="finishedAt" label="Finished at" rules={[{ required: true }]} wrapperCol={{ span: 24 }}>
								<DatePicker format="DD.MM.YYYY" />
							</Form.Item>
						</Col>
					</Row>

					<Form.Item name="description" label="Description" wrapperCol={{ span: 24 }}>
						<Input.TextArea rows={2} />
					</Form.Item>
				</Form>
			</Spin>
		</Modal>
	)
}

export default StageStageModal
