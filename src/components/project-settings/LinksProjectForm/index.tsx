import { useState } from 'react'
import { useTranslate } from '@tolgee/react'
import { Alert, Button, Card, Flex, Form, message, Spin } from 'antd'

type LinksProjectFormArgs = {
	projectSlug: string
}

const LinksProjectForm = ({ projectSlug }: LinksProjectFormArgs) => {
	const [form] = Form.useForm()
	const { t } = useTranslate()
	const [processing, setProcessing] = useState(false)

	const handleForm = async () => {
		try {
			const formData = await form.validateFields()
			console.log(formData)
		} catch (error: any) {
			message.error(error.message)
		}
	}

	return (
		<Spin spinning={processing}>
			<Form
				form={form}
				layout="vertical"
				variant="filled"
				name="profile-general-form"
				wrapperCol={{ xs: { span: 24 }, lg: { span: 12 } }}
				onFinish={() => {}}
				onFinishFailed={() => {}}
				autoComplete="off"
				requiredMark="optional"
				initialValues={
					{
						// name: profile.name,
						// country: profile.country,
						// city: profile.city,
						// tgNickname: profile.tgNickname,
						// lang: profile?.user.lang || getLanguage(),
					}
				}
			>
				<Flex vertical gap={16}>
					<Card title={t('components.profile-forms.general.card.account', 'Project Links')} variant="borderless">
						{/* <Form.Item
							label={t('components.profile-forms.general.card.account', 'Display Name')}
							name="name"
							rules={[{ required: true }]}
							required
						>
							<Input />
						</Form.Item> */}
						<Alert type="info" message={'The section is under development'} />
					</Card>

					{/* <Card variant="borderless">
						<Button type="primary" onClick={handleForm} loading={processing}>
							{t('components.profile-forms.general.card.save', 'Save')}
						</Button>
					</Card> */}
				</Flex>
			</Form>
		</Spin>
	)
}

export default LinksProjectForm
