import { Button, Card, Form, Input, message } from 'antd'

const GeneralProfileForm = ({ visible }: any) => {
	const [form] = Form.useForm()

	const handleForm = async () => {
		const values = await form.validateFields()

		message.success('Your profile has been updated')
	}

	return (
		<Card title="General" extra={<Button onClick={handleForm}>Save</Button>}>
			<Form
				form={form}
				layout="vertical"
				name="profile-general-form"
				wrapperCol={{ span: 12 }}
				onFinish={() => {}}
				onFinishFailed={() => {}}
				autoComplete="off"
				requiredMark="optional"
			>
				<Form.Item
					label="Name"
					name="name"
					tooltip={{ title: 'Tooltip with customize icon' }}
					rules={[{ required: true }]}
				>
					<Input />
				</Form.Item>
				<Form.Item
					label="Country"
					name="country"
					tooltip={{ title: 'Tooltip with customize icon' }}
					rules={[{ required: true }]}
				>
					<Input />
				</Form.Item>
				<Form.Item
					label="City"
					name="city"
					tooltip={{ title: 'Tooltip with customize icon' }}
					rules={[{ required: true }]}
				>
					<Input />
				</Form.Item>
				<Form.Item label="Telegram Nickname" name="Telegram Nickname" rules={[{ required: true }]}>
					<Input />
				</Form.Item>
			</Form>
		</Card>
	)
}

export default GeneralProfileForm
