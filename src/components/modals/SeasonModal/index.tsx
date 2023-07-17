import { useEffect, useState } from 'react'
import { Switch, Col, DatePicker, Form, Input, message, Modal, Row, Select, Spin } from 'antd'
import axios from 'axios'
import { useMutation, useQuery } from 'react-query'

enum DefaultSeasonStages {
	Searching,
	PreProduction,
	Recruiting,
	Prototyping,
	Production,
	Pitching,
}

const ProjectIdeaModal = ({ seasonId, open, onOk, onCancel }: any) => {
	const [form] = Form.useForm()
	const { data: response, isLoading: isLoading } = useQuery(
		['season', seasonId],
		() => axios.get(`/api/season/${seasonId}`),
		{
			enabled: !!seasonId,
			onSuccess(data) {
				form.setFieldsValue(data)
			},
		}
	)
	const { mutate: createSeason, isLoading: isCreateProcessing } = useMutation(() => axios.post('/api/season'))
	const { mutate: updateSeason, isLoading: isSaveProcessing } = useMutation(() => axios.put(`/api/season/${seasonId}`))

	const handleOk = async () => {
		try {
			const formData = await form.validateFields()

			const action = seasonId ? () => updateSeason(formData) : () => createSeason(formData)
			await action()

			message.success(seasonId ? 'Record was updated' : 'New record was added')
			onOk()
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
			title={seasonId ? 'Edit season' : 'New season'}
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
				>
					<Form.Item name="id" noStyle hidden>
						<Input />
					</Form.Item>

					<Row gutter={[16, 16]} align="middle">
						<Col flex={1} xs={{ span: 24 }} md={{ span: 13 }}>
							<Form.Item label="Title" name="name" rules={[{ required: true }]} wrapperCol={{ span: 24 }}>
								<Input size="large" />
							</Form.Item>
						</Col>
						<Col xs={{ span: 24 }} md={{ span: 5 }}>
							<Form.Item
								name="slug"
								label="Slug"
								wrapperCol={{ span: 24 }}
								rules={[
									{
										required: true,
										pattern: new RegExp(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
										message: 'No/missing symbols',
									},
								]}
							>
								<Input prefix="/" />
							</Form.Item>
						</Col>
						<Col xs={{ span: 24 }} md={{ span: 6 }}>
							<Form.Item name="status" label="Status" wrapperCol={{ span: 24 }} rules={[{ required: true }]}>
								<Select
									options={Object.values(DefaultSeasonStages)
										.filter((key) => !Number.isInteger(key))
										.map((key) => ({ label: key, value: key }))}
								/>
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
							<Form.Item name="finishedAt" label="Finished at" rules={[{ required: false }]} wrapperCol={{ span: 24 }}>
								<DatePicker format="DD.MM.YYYY" />
							</Form.Item>
						</Col>
					</Row>

					<Form.Item name="description" label="Description" wrapperCol={{ span: 24 }}>
						<Input.TextArea rows={6} />
					</Form.Item>

					<Form.Item
						name="isActive"
						label="Is active?"
						rules={[{ required: false }]}
						wrapperCol={{ span: 24 }}
						valuePropName="checked"
					>
						<Switch />
					</Form.Item>
				</Form>
			</Spin>
		</Modal>
	)
}

export default ProjectIdeaModal
