import { useEffect, useMemo, useState } from 'react'
import { Profile } from '@prisma/client'
import { AutoComplete, Button, Card, Form, Input, message, Spin } from 'antd'
import { useSession } from 'next-auth/react'
import countryList from 'react-select-country-list'

type GeneralProfileFormArgs = {
	profile: Profile
	saveProfile: (data: { id: string; data: Partial<Profile> }) => Promise<void>
}

const GeneralProfileForm = ({ profile, saveProfile }: GeneralProfileFormArgs) => {
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
			await saveProfile({ id: profile.id, data: formData })
			setProcessing(false)

			let telegramUsername = formData.tgNickname as string
			telegramUsername = telegramUsername.replace(/@/g, '').replace(/https:\/\/t\.me\//g, '')
			form.setFieldValue('tgNickname', telegramUsername)

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
						name: profile.name,
						country: profile.country,
						city: profile.city,
						portfolioLink: profile.portfolioLink,
						tgNickname: profile.tgNickname,
					}}
				>
					<Form.Item label="Электронная почта" tooltip={{ title: 'Получена из вашего Google-аккаунта' }} required>
						<Input disabled readOnly value={session?.user?.email || ''} />
					</Form.Item>
					<Form.Item label="Ваше имя" name="name" rules={[{ required: true }]} required>
						<Input />
					</Form.Item>
					<Form.Item label="Страна" name="country" rules={[{ required: true }]} required>
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
					<Form.Item label="Город" name="city" rules={[{ required: false }]}>
						<Input />
					</Form.Item>
					<Form.Item
						label="Telegram Никнейм"
						name="tgNickname"
						rules={[{ required: true }]}
						extra="Указывать без символа @"
					>
						<Input />
					</Form.Item>
					<Form.Item label="Ссылка на резюме или портфолио" name="portfolioLink" rules={[{ type: 'url' }]}>
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
