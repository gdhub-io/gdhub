import { useEffect, useState } from 'react'
import { Profile } from '@prisma/client'
import { Button, Card, Col, Form, Input, InputNumber, message, Row, Space, Spin, Typography } from 'antd'

const { Text } = Typography

type ResourcesProfileFormArgs = {
	profile: Profile
	saveProfile: (data: Partial<Profile>) => Promise<void>
}

const ResourcesProfileForm = ({ profile, saveProfile }: ResourcesProfileFormArgs) => {
	const [form] = Form.useForm()
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

			message.success('Данные о ресурсах обновлены')
		} catch (error: any) {
			setProcessing(false)
		}
	}

	return (
		<Card title="Ресурсы">
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
						label="Доступное время (в неделю)"
						tooltip={{ title: 'Сколько часов в неделю вы можете уделять участию в проектах.' }}
						wrapperCol={{ span: 24 }}
						required
						valuePropName="value"
					>
						<Row>
							<Col md={{ span: 12 }} xs={{ span: 24 }}>
								<Space>
									<Text>От </Text>
									<Form.Item name="timeForWorkMin" noStyle rules={[{ required: true }]}>
										<InputNumber min={1} max={55} placeholder="минимум" />
									</Form.Item>
									<Text>до</Text>
									<Form.Item
										name="timeForWorkMax"
										noStyle
										rules={[
											{ required: true },
											{
												validator: (_, value) =>
													form.getFieldValue('timeForWorkMin') > value
														? Promise.reject('Максимальное значение не может быть меньше минимального')
														: Promise.resolve(),
											},
										]}
									>
										<InputNumber min={2} max={56} placeholder="максиммум" />
									</Form.Item>
									<Text> часов в неделю</Text>
								</Space>
							</Col>
						</Row>
					</Form.Item>

					<Form.Item label="Другие ресурсы" name="otherResources">
						<Input.TextArea rows={2} />
					</Form.Item>

					<Button type="primary" onClick={handleForm} loading={processing}>
						Сохранить
					</Button>
				</Form>
			</Spin>
		</Card>
	)
}

export default ResourcesProfileForm
