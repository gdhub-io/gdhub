import { useEffect, useMemo, useState } from 'react'
import { Profile } from '@prisma/client'
import { T, useTolgee } from '@tolgee/react'
import { AutoComplete, Button, Card, Form, Input, message, Spin } from 'antd'
import { useSession } from 'next-auth/react'
import countryList from 'react-select-country-list'

type GeneralProfileFormArgs = {
	profile: Profile
	saveProfile: (data: { id: string; data: Partial<Profile> }) => Promise<void>
}

const GeneralProfileForm = ({ profile, saveProfile }: GeneralProfileFormArgs) => {
	const [form] = Form.useForm()
	const { t } = useTolgee()
	const { data: session, update: sessionUpdate } = useSession()
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
			await saveProfile(formData)
			await sessionUpdate({ user: { name: formData.name } })
			setProcessing(false)

			if (formData.tgNickname) {
				let telegramUsername = formData.tgNickname as string
				telegramUsername = telegramUsername.replace(/@/g, '').replace(/https:\/\/t\.me\//g, '')
				form.setFieldValue('tgNickname', telegramUsername)
			}

			message.success(t('profile-forms.general.update-message', 'Your profile data is updated'))
		} catch (error: any) {
			setProcessing(false)
			message.error(error.message)
		}
	}

	return (
		<Card title={<T keyName="profile-forms.general.card.title">User data</T>}>
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
						tgNickname: profile.tgNickname,
					}}
				>
					<Form.Item
						label={<T keyName="profile-forms.general.field.email.title">Email</T>}
						tooltip={{ title: t('profile-forms.general.field.email.tooltip', 'Received from your Google account') }}
						required
					>
						<Input disabled readOnly value={session?.user?.email || ''} />
					</Form.Item>
					<Form.Item
						label={<T keyName="profile-forms.general.field.tgNickname.title">Telegram nickname</T>}
						name="tgNickname"
						extra={<T keyName="profile-forms.general.field.tgNickname.extra">Indicate without symbol @</T>}
					>
						<Input />
					</Form.Item>
					<Form.Item label={<T>Your Name</T>} name="name" rules={[{ required: true }]} required>
						<Input />
					</Form.Item>
					<Form.Item label={<T>Country</T>} name="country" rules={[{ required: true }]} required>
						<AutoComplete
							allowClear
							placeholder={<T>Country</T>}
							filterOption={(inputValue, option) =>
								option?.title?.toLowerCase().indexOf(inputValue.toLowerCase()) !== -1
							}
						>
							{countries.map(({ value, label }: any) => (
								<AutoComplete.Option key={value} value={label} title={label}>
									{label}
								</AutoComplete.Option>
							))}
						</AutoComplete>
					</Form.Item>
					<Form.Item label={<T>City</T>} name="city" rules={[{ required: false }]}>
						<Input />
					</Form.Item>
					<Button type="primary" onClick={handleForm} loading={processing}>
						<T>Save</T>
					</Button>
				</Form>
			</Spin>
		</Card>
	)
}

export default GeneralProfileForm
