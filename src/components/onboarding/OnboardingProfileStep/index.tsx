import { useMemo } from 'react'
import { deleteCookie, getCookie } from '@/helpers/cookie'
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
import { useSession } from 'next-auth/react'
import { FiChevronDown } from 'react-icons/fi'
import { GoInfo } from 'react-icons/go'
import countryList from 'react-select-country-list'

interface IOnboardingProfileStep {
	onSave: (params: { userId: string }) => void
	onLoading: (response: Record<string, any>) => void
}

const { Paragraph, Title } = Typography

export const OnboardingProfileStep = ({ onSave, onLoading = () => {} }: IOnboardingProfileStep) => {
	const router = useRouter()
	const [form] = Form.useForm()
	const { t } = useTolgee()
	const { data: session } = useSession()
	const countries = useMemo(() => countryList().getData(), [])

	const { isLoading, isFetched } = useQuery(
		['profile', session?.user.id],
		() => axios.get<any>('/api/auth/registration/onboarding/profile'),
		{
			enabled: !!session?.user.id,
			refetchInterval: false,
			refetchOnWindowFocus: false,
			onSuccess: (response) => {
				if (!response.data) return

				const { data } = response

				const [firstName, lastName] = data.name.split(' ')
				form.setFieldsValue({
					firstName,
					lastName,
					yearOfBirth: data.yearOfBirth,
					country: data.country,
					city: data.city,
					confirmUserData: data.user.agreements.confirmUserData,
				})

				onLoading(data)
			},
		}
	)

	const { mutateAsync: saveUserProfile, isLoading: isSaving } = useMutation((data: any) =>
		axios.put<any>('/api/auth/registration/onboarding/profile', data)
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
			const { firstName, lastName, ...data } = await form.validateFields()
			let preRegistrationData: Record<string, any> | undefined = undefined

			if (router.query.provider) {
				let preRegistrationCookie = getCookie(`auth.${router.query.provider}.pre-registration`)
				preRegistrationData = preRegistrationCookie ? JSON.parse(preRegistrationCookie) : undefined
			}

			const res = await saveUserProfile({
				...data,
				name: [firstName, lastName].join(' '),
				agreeWithTermsAndPrivacy: preRegistrationData?.agreeWithTermsAndPrivacy,
				needSubscribeToNewsletter: preRegistrationData?.needSubscribeToNewsletter,
			})

			deleteCookie(`auth.${router.query.provider}.pre-registration`)

			onSave({ userId: res.data.id })
		} catch (error: any) {
			if (!error.response || !error.message) return

			message.error(error.response?.data?.message || error.message)
		}
	}

	return (
		<Spin spinning={isLoading && !isFetched}>
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
									<Form.Item label={t('email')} required rules={[{ required: true }]}>
										<Input
											value={session?.user.email || undefined}
											placeholder="max.pain@website.com"
											disabled
											readOnly
										/>
									</Form.Item>
								</Col>
							</Row>
							<Row gutter={[32, 16]}>
								<Col xs={24} lg={12}>
									<Form.Item
										name="yearOfBirth"
										label={t('yearOfBirth')}
										rules={[{ required: true }]}
										tooltip={{ icon: <GoInfo />, title: <T>You should not be younger than 16 years</T> }}
									>
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
