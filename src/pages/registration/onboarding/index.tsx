import { useMemo, useState } from 'react'
import LogingBgImage from '@/assets/images/login-bg.jpg'
import { authOptions } from '@/pages/api/auth/[...nextauth]'
import { useMutation } from '@tanstack/react-query'
import {
	Button,
	Typography,
	Form,
	message,
	Row,
	Col,
	Steps,
	Flex,
	Menu,
	Input,
	Space,
	AutoComplete,
	DatePicker,
} from 'antd'
import { ItemType } from 'antd/es/menu/hooks/useItems'
import axios from 'axios'
import { NextPage } from 'next'
import Head from 'next/head'
import { getServerSession } from 'next-auth'
import { FiChevronDown } from 'react-icons/fi'
import countryList from 'react-select-country-list'
import styles from './style.module.scss'

const { Paragraph, Title } = Typography

declare global {
	interface Window {
		$crisp?: any
	}
}

const OnboardingPage: NextPage = () => {
	const [form] = Form.useForm()
	const [registrationStep, setRegistrationStep] = useState(1)
	const [email, setEmail] = useState<string>()
	const countries = useMemo(() => countryList().getData(), [])

	const { mutateAsync: sendRegistrationLink, isLoading: isRegistration } = useMutation((data: { email: string }) =>
		axios.post<void>('/api/email/registration', data)
	)

	const handleSend = async () => {
		const { email } = await form.validateFields()
		const response = await sendRegistrationLink({ email })

		setEmail(email)

		if (response?.status == 204) {
			setRegistrationStep(3)
		} else {
			message.error(response?.statusText)
		}
	}

	const onboardingMenu: ItemType<any>[] = [
		{ title: 'User Profile', value: 'user-profile' },
		{ title: 'Speciality', value: 'speciality' },
		{ title: 'Interests', value: 'interests' },
		{ title: 'Resources', value: 'resources' },
	]

	return (
		<>
			<Head>
				<title>Registration</title>
			</Head>
			<div className={`${styles.container} bright-container`} style={{ backgroundImage: `url(${LogingBgImage.src})` }}>
				<div className="onboarding-box">
					<div className="onboarding-header">
						<Flex align="center">
							<Title style={{ flex: '400px' }}>Registration</Title>
							<Steps
								current={0}
								className={styles.horizontalSteps}
								progressDot
								direction="horizontal"
								items={onboardingMenu}
								style={{ flex: 'auto' }}
							/>
						</Flex>
					</div>
					<div className="onboarding-container">
						<Row>
							<Col md={{ span: 6 }}>
								<div className="onboarding-sidemenu">
									<Menu items={onboardingMenu} />
								</div>
							</Col>
							<Col md={{ span: 18 }}>
								<div className="onboarding-content">
									<div className="onboarding-form">
										<div className="onboarding-form-title">
											<Title level={2}>User Profile</Title>
											<Paragraph italic>General information about new member</Paragraph>
										</div>

										<Form form={form} layout="vertical" requiredMark="optional" autoComplete="off">
											<Space direction="vertical" size={16}>
												<Row gutter={[32, 16]}>
													<Col xs={24} lg={12}>
														<Form.Item name="firstName" label="First Name">
															<Input />
														</Form.Item>
													</Col>
													<Col xs={24} lg={12}>
														<Form.Item name="lastName" label="Last Name">
															<Input />
														</Form.Item>
													</Col>
													<Col xs={24} lg={12}>
														<Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
															<Input />
														</Form.Item>
													</Col>
												</Row>
												<Row gutter={[32, 16]}>
													<Col xs={24} lg={12}>
														<Form.Item name="gender" label="Gender">
															<Input />
														</Form.Item>
													</Col>
													<Col xs={24} lg={12}>
														<Form.Item name="dateOfBirth" label="Date of Birth">
															<DatePicker style={{ width: '100%' }} />
														</Form.Item>
													</Col>
													<Col xs={24} lg={12}>
														<Form.Item name="country" label="Country">
															<AutoComplete
																allowClear
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
														<Form.Item name="city" label="City">
															<Input />
														</Form.Item>
													</Col>
												</Row>
											</Space>
										</Form>
									</div>
									<div className="onboarding-footer">
										<Button type="primary">Save and continue</Button>
									</div>
								</div>
							</Col>
						</Row>
					</div>
				</div>
			</div>
		</>
	)
}

export const getServerSideProps = async (context: any) => {
	const session = await getServerSession(context.req, context.res, authOptions)

	if (session?.user) {
		return {
			redirect: {
				destination: '/hub',
				permanent: false,
			},
		}
	}

	return {
		props: {},
	}
}

export default OnboardingPage
