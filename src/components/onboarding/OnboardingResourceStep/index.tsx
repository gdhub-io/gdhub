import { useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Button, Checkbox, Col, Form, Input, InputNumber, Row, Space, Typography, message } from 'antd'
import axios from 'axios'
import { useSession } from 'next-auth/react'
import styles from './style.module.scss'

const { Paragraph, Title, Text } = Typography

interface IOnboardingResourceStep {
	onSave: () => void
	onPreviousStep: () => void
	onLoading?: () => void
}

export const OnboardingResourceStep = ({
	onSave,
	onLoading = () => {},
	onPreviousStep = () => {},
}: IOnboardingResourceStep) => {
	const [form] = Form.useForm()
	const { t } = useTolgee()
	const { data: session, update: updateSession } = useSession()

	const { data: profileData } = useQuery({
		queryKey: ['profile', session?.user.id],
		queryFn: () => axios.get<any>('/api/auth/registration/onboarding/resources'),
		enabled: !!session?.user.id,
		refetchInterval: false,
		refetchOnWindowFocus: false,
	})

	useEffect(() => {
		if (!profileData?.data) return

		const { timeForWork, isActive, otherResources } = profileData.data

		const hasTimeForWork = timeForWork && timeForWork.length === 2

		form.setFieldsValue({
			timeForWorkMin: hasTimeForWork ? timeForWork[0] : undefined,
			timeForWorkMax: hasTimeForWork ? timeForWork[1] : undefined,
			isActive,
			otherResources,
		})

		onLoading()
	}, [profileData?.data])

	const { mutateAsync: saveUserResources, isPending: isSaving } = useMutation({
		mutationFn: (data: any) => axios.put<any>('/api/auth/registration/onboarding/resources', data),
	})

	const handleSave = async () => {
		try {
			const { timeForWorkMin, timeForWorkMax, isActive, otherResources } = await form.validateFields()

			await saveUserResources({
				isActive,
				otherResources,
				timeForWork: timeForWorkMin && timeForWorkMax ? [timeForWorkMin, timeForWorkMax] : undefined,
			})

			await updateSession()

			onSave()
		} catch (error: any) {
			if (!error.response || !error.message) return

			message.error(error.response?.data?.message || error.message)
		}
	}

	return (
		<div className={styles.container}>
			<div className="onboarding-content">
				<div className="onboarding-form">
					<div className="onboarding-form-title">
						<Title level={2}>
							<T keyName="resources">Recources</T>
						</Title>
						<Paragraph italic>
							<T>How can you be useful to teams?</T>
						</Paragraph>
						<Paragraph italic type="secondary">
							<T>
								The main resource is your time, which you are willing to spend on participating in projects. You can
								also provide additional information
							</T>
						</Paragraph>
					</div>

					<Form
						form={form}
						layout="vertical"
						variant="filled"
						requiredMark="optional"
						autoComplete="off"
						scrollToFirstError
						initialValues={{ isActive: true }}
					>
						<Space direction="vertical" size={16} style={{ width: '100%' }}>
							<Form.Item
								label={<T keyName="availableTime" />}
								tooltip={{ title: t('How many hours a week can you devote to projects?') }}
								wrapperCol={{ span: 24 }}
								required
								valuePropName="value"
							>
								<Row>
									<Col md={{ span: 12 }} xs={{ span: 24 }}>
										<Space>
											<Form.Item name="timeForWorkMin" noStyle rules={[{ required: true }]}>
												<InputNumber min={1} max={55} placeholder={t('minimum')} />
											</Form.Item>
											<Text>—</Text>
											<Form.Item
												name="timeForWorkMax"
												noStyle
												rules={[
													{ required: true },
													{
														validator: (_, value) =>
															form.getFieldValue('timeForWorkMin') > value
																? Promise.reject(t('The maximum value cannot be less than the minimum'))
																: Promise.resolve(),
													},
												]}
											>
												<InputNumber min={2} max={56} placeholder={t('maximum')} />
											</Form.Item>
											<Text>{t('hours-a-week', 'hours a week')}</Text>
										</Space>
									</Col>
								</Row>
							</Form.Item>

							<Form.Item name="isActive" valuePropName="checked">
								<Checkbox>
									<T>I&apos;m available for offering</T>
								</Checkbox>
							</Form.Item>

							<Form.Item name="otherResources" label={t('additionalInformation')}>
								<Input.TextArea rows={8} />
							</Form.Item>
						</Space>
					</Form>
				</div>
				<Space wrap className="onboarding-footer">
					<Button onClick={onPreviousStep}>
						<T keyName="back">Back</T>
					</Button>
					<Button type="primary" onClick={handleSave} loading={isSaving}>
						<T keyName="save">Save</T>
					</Button>
				</Space>
			</div>
		</div>
	)
}
