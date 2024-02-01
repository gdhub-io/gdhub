import { useState } from 'react'
import RegistrationBgImage from '@/assets/images/registration-bg.jpg'
import { setCookie } from '@/helpers/cookie'
import { EmptyLayout } from '@/layouts/EmptyLayout'
import { authOptions } from '@/pages/api/auth/[...nextauth]'
import { T, useTolgee } from '@tolgee/react'
import { Button, Space, Typography, Form, Input, message, Checkbox, notification } from 'antd'
import { NextPage } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
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
	const [formRegEmail] = Form.useForm()
	const [formRegGoogle] = Form.useForm()
	const { t } = useTolgee()
	const router = useRouter()
	const [registrationStep, setRegistrationStep] = useState({ step: 1, provider: 'email' })
	const [email, setEmail] = useState<string>()
	const [isRegistration, setIsRegistration] = useState(false)

	const handleSendWithEmail = async () => {
		setIsRegistration(true)

		const { email, agreeWithTermsAndPrivacy, needSubscribeToNewsletter } = await formRegEmail.validateFields()

		setCookie(
			'auth.email.pre-registration',
			JSON.stringify({
				for: router.query.for || '',
				agreeWithTermsAndPrivacy,
				needSubscribeToNewsletter,
			})
		)

		const response = await signIn('email', {
			email,
			redirect: false,
			callbackUrl: `/registration/onboarding?provider=email${router.query?.for ? '&for=' + router.query.for : ''}`,
		})

		if (response?.ok) {
			setRegistrationStep({ step: 3, provider: 'email' })
		}

		if (response?.error) {
			message.error(response?.error)
		}

		setEmail(email)
		setIsRegistration(false)
	}

	const handleSendWithGoogle = async () => {
		setIsRegistration(true)

		const { agreeWithTermsAndPrivacy, needSubscribeToNewsletter } = await formRegEmail.validateFields()

		setCookie(
			'auth.google.pre-registration',
			JSON.stringify({
				for: router.query.for || '',
				agreeWithTermsAndPrivacy,
				needSubscribeToNewsletter,
			})
		)

		await signIn(
			'google',
			{ callbackUrl: `/registration/onboarding?provider=google${router.query?.for ? '?for=' + router.query.for : ''}` },
			{ prompt: 'select_account consent' }
		)

		setIsRegistration(false)
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
							{registrationStep.step < 3 && <Title>Registration</Title>}
							{registrationStep.step == 1 && (
								<>
									<Space direction="vertical" size={24}>
										<Button
											type="primary"
											style={{ width: '100%' }}
											onClick={() => setRegistrationStep({ step: 2, provider: 'email' })}
										>
											Create new account
										</Button>
										<Button
											type="primary"
											style={{ width: '100%' }}
											icon={<FaGoogle size={16} />}
											onClick={() => setRegistrationStep({ step: 2, provider: 'google' })}
										>
											Registration with Google
										</Button>
										<Link href="/signin" className={styles.createAccountLink}>
											I already have an account
										</Link>
										<Link href="/">
											<Button className="btn-default-on-white" style={{ width: '100%' }}>
												Back to main
											</Button>
										</Link>
									</Space>
								</>
							)}

							{registrationStep.step == 2 && registrationStep.provider == 'google' && (
								<>
									<Space direction="vertical" size={24}>
										<Form form={formRegGoogle} layout="vertical">
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
											<Button type="primary" onClick={handleSendWithGoogle} loading={isRegistration}>
												Continue with Google
											</Button>
											<Button type="link" onClick={() => setRegistrationStep({ step: 1, provider: 'email' })}>
												Back
											</Button>
										</Space>
									</Space>
								</>
							)}

							{registrationStep.step == 2 && registrationStep.provider == 'email' && (
								<>
									<Space direction="vertical" size={24}>
										<Paragraph>We will send a letter to email with a registration link</Paragraph>

										<Form form={formRegEmail} layout="vertical">
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
											<Button type="primary" onClick={handleSendWithEmail} loading={isRegistration}>
												Send registration link
											</Button>
											<Button type="link" onClick={() => setRegistrationStep({ step: 1, provider: 'email' })}>
												Back
											</Button>
										</Space>
									</Space>
								</>
							)}

							{registrationStep.step == 3 && registrationStep.provider == 'email' && (
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
