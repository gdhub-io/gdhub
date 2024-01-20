import { useMemo } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import {
	Spin,
	Form,
	Input,
	Space,
	Row,
	Col,
	Select,
	AutoComplete,
	notification,
	Checkbox,
	Button,
	Typography,
	message,
} from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'
import { useRouter } from 'next/router'
import { FiChevronDown } from 'react-icons/fi'
import countryList from 'react-select-country-list'
import styles from './style.module.scss'

interface IOnboardingProfileStep {
	publicAccessToken: string
	onSave: (params: { userId: string }) => void
	onLoading: (response: Record<string, any>) => void
}

const { Paragraph, Title } = Typography

export const OnboardingProfileStep = ({ publicAccessToken, onSave, onLoading = () => {} }: IOnboardingProfileStep) => {
	const router = useRouter()
	const [form] = Form.useForm()
	const { t } = useTolgee()
	const countries = useMemo(() => countryList().getData(), [])

	const { isLoading } = useQuery(
		['registration', router.query.token],
		() =>
			axios.get<any>('/api/auth/registration/onboarding/profile', {
				params: { registrationToken: router.query.token },
				headers: { Authorization: `Bearer ${publicAccessToken}` },
			}),
		{
			enabled: !!router.query.token,
			refetchInterval: false,
			refetchOnWindowFocus: false,
			onSuccess: (response) => {
				if (!response.data) return

				const [firstName, lastName] = response?.data.name.split(' ')
				form.setFieldsValue({
					userId: response?.data.id,
					firstName,
					lastName,
					email: response?.data.email,
					yearOfBirth: response?.data.profile.yearOfBirth,
					country: response?.data.profile.country,
					city: response?.data.profile.city,
					confirmUserData: response?.data.profile.agreements.confirmUserData,
					agreeWithTermsAndPrivacy: response?.data.profile.agreements.agreeWithTermsAndPrivacy,
					needSubscribeToNewsletter: response?.data.profile.agreements.needSubscribeToNewsletter,
				})

				onLoading(response.data)
			},
		}
	)

	const { mutateAsync: saveUserProfile, isLoading: isSaving } = useMutation((data: any) =>
		axios.post<any>('/api/auth/registration/onboarding/profile', data, {
			headers: { Authorization: `Bearer ${publicAccessToken}` },
		})
	)

	const yearOptions = useMemo(
		() =>
			new Array(84).fill(0).map((r, i) => {
				const _year = dayjs().year() - i - 16
				return { label: _year, value: _year }
			}),
		[]
	)

	const handleSaveProfileAndNextStep = async () => {
		try {
			const data = await form.validateFields()

			console.log('formProfile', data)

			const res = await saveUserProfile(data)

			onSave({ userId: res.data.userId })
		} catch (error: any) {
			if (!error.response || !error.message) return

			message.error(error.response?.data?.message || error.message)
		}
	}

	return (
		<Spin spinning={isLoading}>
			<div className="onboarding-content">
				<div className="onboarding-form">
					<div className="onboarding-form-title">
						<Title level={2}>
							<T keyName="user-profile">User Profile</T>
						</Title>
						<Paragraph italic>
							<T>General information about new member</T>
						</Paragraph>
					</div>

					<Form
						form={form}
						layout="vertical"
						requiredMark="optional"
						autoComplete="off"
						scrollToFirstError
						initialValues={{ registrationToken: router.query.token as string }}
					>
						<Form.Item name="registrationToken" hidden>
							<Input />
						</Form.Item>

						<Space direction="vertical" size={16} style={{ width: '100%' }}>
							<Row gutter={[32, 16]}>
								<Col xs={24} lg={12}>
									<Form.Item name="firstName" label={t('firstName')} rules={[{ required: true }]}>
										<Input placeholder={t('firstName.plachehloder')} />
									</Form.Item>
								</Col>
								<Col xs={24} lg={12}>
									<Form.Item name="lastName" label={t('lastName')} rules={[{ required: true }]}>
										<Input placeholder={t('lastName.plachehloder')} />
									</Form.Item>
								</Col>
								<Col xs={24} lg={12}>
									<Form.Item
										name="email"
										label={t('email')}
										rules={[{ required: true, type: 'email' }]}
										extra={
											<T keyName="registration.email.extra">
												The email must match the one you entered when you started registering
											</T>
										}
									>
										<Input placeholder="max.pain@website.com" />
									</Form.Item>
								</Col>
							</Row>
							<Row gutter={[32, 16]}>
								<Col xs={24} lg={12}>
									<Form.Item name="yearOfBirth" label={t('yearOfBirth')} rules={[{ required: true }]}>
										<Select options={yearOptions} placeholder={dayjs().subtract(16, 'years').year()} />
									</Form.Item>
								</Col>
							</Row>
							<Row gutter={[32, 16]}>
								<Col xs={24} lg={12}>
									<Form.Item name="country" label={t('country')} rules={[{ required: true }]}>
										<AutoComplete
											allowClear
											placeholder={t('country.placeholder', 'Select country')}
											suffixIcon={<FiChevronDown size={24} color="#afafaf" />}
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
								</Col>
								<Col xs={24} lg={12}>
									<Form.Item name="city" label={t('city')}>
										<Input placeholder={t('city.placeholder')} />
									</Form.Item>
								</Col>
							</Row>

							<Form.Item
								name="confirmUserData"
								valuePropName="checked"
								noStyle
								rules={[
									{
										validator: (_, value) => {
											if (!value) {
												notification.error({
													message: t(
														'confirmUserData.error',
														'You should confirm the accuracy of the information entered'
													),
												})
											}
											return value ? Promise.resolve() : Promise.reject()
										},
									},
								]}
							>
								<Checkbox>
									<T keyName="confirmUserData">I confirm the accuracy of the information entered</T>
								</Checkbox>
							</Form.Item>

							<Form.Item
								name="agreeWithTermsAndPrivacy"
								valuePropName="checked"
								noStyle
								rules={[
									{
										validator: (_, value) => {
											if (!value) {
												notification.error({
													message: t(
														'agreeWithTermsAndPrivacy.error',
														'You should confirm the accuracy of the information entered'
													),
												})
											}
											return value ? Promise.resolve() : Promise.reject()
										},
									},
								]}
							>
								<Checkbox>
									<T keyName="agreeWithTermsAndPrivacy">
										By joining, you agree to our Terms of Service and Privacy Policy
									</T>
								</Checkbox>
							</Form.Item>

							<Form.Item name="needSubscribeToNewsletter" valuePropName="checked" noStyle>
								<Checkbox>
									<T keyName="subscribeToNewsletter">Receive platform news</T>
								</Checkbox>
							</Form.Item>
						</Space>
					</Form>
				</div>
				<div className="onboarding-footer">
					<span></span>
					<Button type="primary" onClick={handleSaveProfileAndNextStep} loading={isSaving}>
						<T keyName="saveAndContinue">Save and continue</T>
					</Button>
				</div>
			</div>
		</Spin>
	)
}
