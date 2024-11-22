import { useEffect, useState } from 'react'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { T, useTolgee } from '@tolgee/react'
import { Button, Card, Col, Form, Input, InputNumber, message, Row, Space, Spin, Typography } from 'antd'

const { Text } = Typography

type ResourcesProfileFormArgs = {
	profile: prismaClient.Profile
	saveProfile: (data: Partial<prismaClient.Profile>) => Promise<void>
}

const ResourcesProfileForm = ({ profile, saveProfile }: ResourcesProfileFormArgs) => {
	const [form] = Form.useForm()
	const { t } = useTolgee()
	const [processing, setProcessing] = useState(true)

	useEffect(() => {
		if (profile) {
			setProcessing(false)

			if (profile.timeForWork && Array.isArray(profile.timeForWork)) {
				form.setFieldsValue({
					timeForWorkMin: profile.timeForWork[0],
					timeForWorkMax: profile.timeForWork[1],
				})
			}
		}
	}, [profile])

	const handleForm = async () => {
		try {
			const { timeForWorkMin, timeForWorkMax, otherResources } = await form.validateFields()
			const timeForWork: number[] = [timeForWorkMin, timeForWorkMax]

			setProcessing(true)
			await saveProfile({ timeForWork, otherResources })
			setProcessing(false)

			message.success(t('profile-forms.resources.update-message', 'Resource data updated'))
		} catch (error: any) {
			setProcessing(false)
		}
	}

	return (
		<Card title={<T keyName="profile-forms.resources.card.title">Resources</T>} bordered={false}>
			<Spin spinning={processing}>
				<Form
					form={form}
					layout="vertical"
					name="profile-resources-form"
					wrapperCol={{ span: 12 }}
					autoComplete="off"
					requiredMark="optional"
					initialValues={{ otherResources: profile?.otherResources }}
				>
					<Form.Item
						label={<T keyName="profile-forms.resources.field.timeForWork.title">Available time (per week)</T>}
						tooltip={{
							title: t(
								'profile-forms.resources.field.timeForWork.tooltip',
								'How many hours a week can you pay to participation in projects.'
							),
						}}
						wrapperCol={{ span: 24 }}
						required
						valuePropName="value"
					>
						<Row>
							<Col md={{ span: 12 }} xs={{ span: 24 }}>
								<Space>
									<Text>
										<T>From</T>{' '}
									</Text>
									<Form.Item name="timeForWorkMin" noStyle rules={[{ required: true }]}>
										<InputNumber min={1} max={55} placeholder={t('minimum')} />
									</Form.Item>
									<Text>
										<T>to</T>
									</Text>
									<Form.Item
										name="timeForWorkMax"
										noStyle
										rules={[
											{ required: true },
											{
												validator: (_, value) =>
													form.getFieldValue('timeForWorkMin') > value
														? Promise.reject(
																t(
																	'profile-forms.resources.field.timeForWorkMax.error',
																	'The maximum value cannot be less than the minimum'
																)
															)
														: Promise.resolve(),
											},
										]}
									>
										<InputNumber min={2} max={56} placeholder={t('maximum')} />
									</Form.Item>
									<Text>
										{' '}
										<T>hours a week</T>
									</Text>
								</Space>
							</Col>
						</Row>
					</Form.Item>

					<Form.Item
						label={t('profile-forms.resources.field.other-resources.label', 'Other resources')}
						name="otherResources"
					>
						<Input.TextArea rows={2} />
					</Form.Item>

					<Button type="primary" onClick={handleForm} loading={processing}>
						<T>Save</T>
					</Button>
				</Form>
			</Spin>
		</Card>
	)
}

export default ResourcesProfileForm
