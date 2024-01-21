import { useState } from 'react'
import RegistrationBgImage from '@/assets/images/registration-bg.jpg'
import { EmptyLayout } from '@/layouts/EmptyLayout'
import { authOptions } from '@/pages/api/auth/[...nextauth]'
import { useMutation } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Button, Space, Typography, Form, Input, message, Checkbox, notification } from 'antd'
import axios from 'axios'
import { NextPage } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { signIn } from 'next-auth/react'
import { FaGoogle } from 'react-icons/fa'
import styles from './style.module.scss'

const { Paragraph, Title } = Typography

declare global {
	interface Window {
		$crisp?: any
	}
}

const RegistrationPage: NextPage = () => {
	const [form] = Form.useForm()
	const { t } = useTolgee()
	const [registrationStep, setRegistrationStep] = useState(1)
	const [email, setEmail] = useState<string>()

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

	return (
		<EmptyLayout type="dark">
			<Head>
				<title>Registration</title>
			</Head>
			<div
				className={`${styles.container} bright-container`}
				style={{ backgroundImage: `url(${RegistrationBgImage.src})` }}
			>
				<div className="login-box">
					<div className="login-form">
						<Space direction="vertical" size={40}>
							{registrationStep < 3 && <Title>Registration</Title>}
							{registrationStep == 1 && (
								<>
									<Space direction="vertical" size={24}>
										<Button type="primary" style={{ width: '100%' }} onClick={() => setRegistrationStep(2)}>
											Create new account
										</Button>
										<Button
											type="primary"
											style={{ width: '100%' }}
											icon={<FaGoogle size={16} />}
											onClick={() =>
												signIn(
													'google',
													{ callbackUrl: '/registration/onboarding' },
													{ prompt: 'select_account consent' }
												)
											}
										>
											Continue with Google
										</Button>
										<Link href="/signin" className={styles.createAccountLink}>
											I already have an acoount
										</Link>
										<Link href="/">
											<Button className="btn-default-on-white" style={{ width: '100%' }}>
												Back to main
											</Button>
										</Link>
									</Space>
								</>
							)}

							{registrationStep == 2 && (
								<>
									<Space direction="vertical" size={24}>
										<Paragraph>We will send a letter to email with a registration link</Paragraph>

										<Form form={form} layout="vertical">
											<Form.Item
												name="email"
												label="Enter Email"
												rules={[{ type: 'email', required: true, message: 'Please enter Email' }]}
											>
												<Input />
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
										</Form>

										<Space size={24}>
											<Button type="primary" onClick={handleSend} loading={isRegistration}>
												Send registration link
											</Button>
											<Button type="link" onClick={() => setRegistrationStep(1)}>
												Back
											</Button>
										</Space>
									</Space>
								</>
							)}

							{registrationStep == 3 && (
								<Space direction="vertical" size={24}>
									<Paragraph style={{ maxWidth: 400 }}>
										We have sent an email to {email} with an access link. Follow the link and complete the following
										registration steps.
									</Paragraph>

									<Link href="/">
										<Button className="btn-default-on-white" style={{ width: '100%' }}>
											Back to main
										</Button>
									</Link>
								</Space>
							)}
						</Space>
					</div>
				</div>
			</div>
		</EmptyLayout>
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

export default RegistrationPage
