import { Button, Card, Col, Form, Input, message, Row } from 'antd'

const SpecialitiesProfileForm = ({ visible }: any) => {
	const [form] = Form.useForm()

	const handleForm = async () => {
		const values = await form.validateFields()

		message.success('Your profile has been updated')
	}

	return (
		<Card title="Specialities" extra={<Button onClick={handleForm}>Add</Button>}>
			<Form
				form={form}
				layout="vertical"
				name="profile-specialities-form"
				// wrapperCol={{ span: 12 }}
				onFinish={() => {}}
				onFinishFailed={() => {}}
				autoComplete="off"
				requiredMark="optional"
			>
				<Row>
					<Col span={14}>
						<Form.Item
							label="Name"
							name="name"
							tooltip={{ title: 'Tooltip with customize icon' }}
							rules={[{ required: true }]}
						>
							<Input />
						</Form.Item>
					</Col>
					<Col span={8} offset={2}>
						<Form.Item label="Level" name="level" rules={[{ required: true }]}>
							<Input />
						</Form.Item>
					</Col>
				</Row>
				<Form.Item
					label="Specialization"
					name="Specialization"
					tooltip={{ title: 'Tooltip with customize icon' }}
					rules={[{ required: true }]}
				>
					<Input.TextArea />
				</Form.Item>
				<Form.Item
					label="Skills"
					name="Skills"
					tooltip={{ title: 'Tooltip with customize icon' }}
					rules={[{ required: true }]}
				>
					<Input.TextArea rows={6} />
				</Form.Item>
				<Form.Item
					label="Tools"
					name="Tools"
					tooltip={{ title: 'Tooltip with customize icon' }}
					rules={[{ required: true }]}
				>
					<Input />
				</Form.Item>
				<Form.Item
					label="Work Places"
					name="Work Places"
					tooltip={{ title: 'Tooltip with customize icon' }}
					rules={[{ required: true }]}
				>
					<Input.TextArea />
				</Form.Item>
				<Form.Item
					label="Schools"
					name="Schools"
					tooltip={{ title: 'Tooltip with customize icon' }}
					rules={[{ required: true }]}
				>
					<Input.TextArea />
				</Form.Item>
			</Form>
		</Card>
	)
}

export default SpecialitiesProfileForm
