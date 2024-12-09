import { useEffect, useState } from 'react'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { T, useTolgee } from '@tolgee/react'
import {
	Button,
	Card,
	Col,
	Form,
	Input,
	InputNumber,
	message,
	Row,
	Space,
	Spin,
	Switch,
	Tooltip,
	Typography,
} from 'antd'

const { Paragraph, Text } = Typography

type MentorshipProfileFormArgs = {
	profile: prismaClient.Profile
}

const MentorshipProfileForm = ({ profile }: MentorshipProfileFormArgs) => {
	const [form] = Form.useForm()
	const { t } = useTolgee()
	const [processing, setProcessing] = useState(true)
	const [enabled, setEnabled] = useState(false)

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

	const saveMentorshipSettings = async ({ someFileds }: any) => {}

	const handleForm = async () => {
		try {
			const { timeForWorkMin, timeForWorkMax, otherMentorship } = await form.validateFields()
			const timeForWork: number[] = [timeForWorkMin, timeForWorkMax]

			setProcessing(true)
			await saveMentorshipSettings({
				/** some fields */
			})
			setProcessing(false)

			message.success(t('profile-forms.mentorship.update-message', 'Resource data updated'))
		} catch (error: any) {
			setProcessing(false)
		}
	}

	const switchMentorshipStatus = (checked: boolean) => setEnabled(checked)

	return (
		<Card
			title={<T keyName="profile-forms.mentorship.card.title">Mentorship</T>}
			bordered={false}
			extra={
				<Tooltip
					title={
						<Text>
							<T keyName="profile-form.mentorship.card.description">
								Turn on if you want other community members to contact you for advice.
							</T>
						</Text>
					}
				>
					<Switch checked={false} disabled loading={false} onChange={switchMentorshipStatus} />
				</Tooltip>
			}
		>
			<Spin spinning={processing}>
				<Paragraph>
					<T>Allows you to contribute to game development through advising</T>
				</Paragraph>
				{enabled && (
					<Form
						form={form}
						layout="vertical"
						variant="filled"
						name="profile-mentorship-form"
						wrapperCol={{ span: 12 }}
						autoComplete="off"
						requiredMark="optional"
						initialValues={
							{
								/** some fileds */
							}
						}
					>
						<Form.Item
							label={<T keyName="profile-forms.mentorship.field.timeForWork.title">Available time (per week)</T>}
							tooltip={{
								title: t(
									'profile-forms.mentorship.field.timeForWork.tooltip',
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
																		'profile-forms.mentorship.field.timeForWorkMax.error',
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
							label={t('profile-forms.mentorship.field.other-mentorship.label', 'Other mentorship')}
							name="otherMentorship"
						>
							<Input.TextArea rows={2} />
						</Form.Item>

						<Button type="primary" onClick={handleForm} loading={processing}>
							<T>Save</T>
						</Button>
					</Form>
				)}
			</Spin>
		</Card>
	)
}

export default MentorshipProfileForm
