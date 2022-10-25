import { useEffect, useMemo, useState } from 'react'
import { AutoComplete, Button, Card, Form, Input, message, Spin } from 'antd'
import { useSession } from 'next-auth/react'
import countryList from 'react-select-country-list'

const GeneralProfileForm = ({ profile }: any) => {
	const [form] = Form.useForm()
	const { data: session } = useSession()
	const [processing, setProcessing] = useState(true)
	const countries = useMemo(() => countryList().getData(), [])

	useEffect(() => {
		if (profile) {
			setProcessing(false)
		}
	}, [profile])

	const handleForm = async () => {
		try {
			const formData = await form.validateFields()

			setProcessing(true)

			const response: any = await fetch('/api/profile/update', {
				method: 'post',
				body: JSON.stringify({ id: profile.id, data: formData }),
				headers: {
					'Content-Type': 'application/json',
				},
			})

			setProcessing(false)

			if (response.error) {
				throw new Error(response.error.message)
			}

			message.success('Данные вашего профиля обновлены')
		} catch (error: any) {
			setProcessing(false)
			message.error(error.message)
		}
	}

	return (
		<Card title="Данные пользователя">
			<Spin spinning={processing}>
				<Form
					form={form}
					layout="vertical"
					name="profile-general-form"
					wrapperCol={{ span: 12 }}
					onFinish={() => {}}
					onFinishFailed={() => {}}
					autoComplete="off"
					requiredMark="optional"
					initialValues={{
						Name: profile?.Name,
						Country: profile?.Country,
						City: profile.City,
						'Telegram Nickname': profile['Telegram Nickname'],
					}}
				>
					<Form.Item label="Email" tooltip={{ title: 'Got from your google account' }} required>
						<Input disabled readOnly value={session?.user?.email || ''} />
					</Form.Item>
					<Form.Item label="Ваше имя" name="Name" rules={[{ required: true }]} required>
						<Input />
					</Form.Item>
					<Form.Item label="Страна" name="Country" rules={[{ required: true }]} required>
						<AutoComplete
							allowClear
							placeholder="Страна"
							filterOption={(inputValue, option) =>
								option!.title.toLowerCase().indexOf(inputValue.toLowerCase()) !== -1
							}
						>
							{countries.map(({ value, label }: any) => (
								<AutoComplete.Option key={value} value={label} title={label}>
									{label}
								</AutoComplete.Option>
							))}
						</AutoComplete>
					</Form.Item>
					<Form.Item label="Город" name="City" rules={[{ required: false }]}>
						<Input />
					</Form.Item>
					<Form.Item label="Telegram Никнейм" name="Telegram Nickname" rules={[{ required: true }]}>
						<Input />
					</Form.Item>
					<Button type="primary" onClick={handleForm}>
						Сохранить
					</Button>
				</Form>
			</Spin>
		</Card>
	)
}

export default GeneralProfileForm
