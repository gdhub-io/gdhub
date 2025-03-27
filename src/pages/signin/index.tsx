import { useState } from 'react'
import React from 'react'
import LogingBgImage from '@/assets/images/login-bg.jpg'
import { authOptions } from '@/pages/api/auth/[...nextauth]'
import { FaGoogle } from '@react-icons/all-files/fa/FaGoogle'
import { T, useTolgee } from '@tolgee/react'
import { Button, Space, Typography, Form, Input, message, Flex, Grid } from 'antd'
import { NextPage } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { getServerSession } from 'next-auth'
import { signIn, signOut } from 'next-auth/react'
import styles from './style.module.scss'

const { Paragraph, Title } = Typography

declare global {
	interface Window {
		$crisp?: any
	}
}

const LoginPage: NextPage = () => {
	const router = useRouter()
	const { t } = useTolgee()
	const screens = Grid.useBreakpoint()
	const [form] = Form.useForm()
	const [loginStep, setLoginStep] = useState(1)
	const [email, setEmail] = useState<string>()
	const [submitting, setSubmitting] = useState<boolean>(false)

	// Check for error in query params
	const { error, callbackUrl } = router.query

	// Show error message if token expired
	React.useEffect(() => {
		if (error === 'RefreshTokenExpired') {
			message.error(t('refresh_token_expired', 'Your session has expired. Please sign in again.'))
		}

		if (error === 'InvalidGrantError') {
			message.error(t('invalid_grant_error', 'Invalid authorization. Please sign in again.'))
		}
	}, [error, t])

	const handleSend = async () => {
		setSubmitting(true)

		const { email } = await form.validateFields()
		const response = await signIn('email', {
			email,
			redirect: false,
			callbackUrl: (router.query.callbackUrl as string) || '/hub',
		})

		setSubmitting(false)
		setEmail(email)

		if (response?.ok) setLoginStep(3)
		if (response?.error) message.error(response?.error)
	}

	return (
		<>
			<Head>
				<title>{t('signin', 'Sign in')}</title>
			</Head>
			<div
				className={`${styles.container}`}
				style={{ backgroundImage: screens.sm ? `url(${LogingBgImage.src})` : undefined }}
			>
				<div className="login-box">
					<div className="login-form">
						<Space direction="vertical" size={40}>
							{loginStep < 3 && (
								<Title>
									<T>Log in</T>
								</Title>
							)}
							{loginStep == 1 && (
								<>
									<Space direction="vertical" size={24}>
										<Button type="primary" style={{ width: '100%' }} onClick={() => setLoginStep(2)}>
											<T>Log in with email</T>
										</Button>
										<Button
											type="primary"
											style={{ width: '100%' }}
											icon={<FaGoogle size={16} />}
											onClick={() =>
												signIn(
													'google',
													{ callbackUrl: (router.query.callbackUrl as string) || '/hub' },
													{ prompt: 'select_account consent' }
												)
											}
										>
											<T>Log in with Google</T>
										</Button>
										<Link href="/registration" className={styles.createAccountLink}>
											<T>Create new account</T>
										</Link>
										<Link href={`/`}>
											<Button className="btn-default-on-white" style={{ width: '100%' }}>
												<T>Back to main</T>
											</Button>
										</Link>
									</Space>
								</>
							)}

							{loginStep == 2 && (
								<>
									<Space direction="vertical" size={24}>
										<Paragraph>
											<T keyName="signin.subtitle">
												We will send a letter to email with a link to log into your account
											</T>
										</Paragraph>

										<Form variant="filled" form={form} layout="vertical">
											<Form.Item
												name="email"
												label={<T>Enter Email</T>}
												rules={[{ type: 'email', required: true, message: 'Please enter Email' }]}
											>
												<Input />
											</Form.Item>
										</Form>

										<Flex justify="center" wrap="wrap" gap={16}>
											<Button type="primary" onClick={handleSend} loading={submitting}>
												<T>Send link to email</T>
											</Button>
											<Button type="link" onClick={() => setLoginStep(1)}>
												<T>Back</T>
											</Button>
										</Flex>
									</Space>
								</>
							)}

							{loginStep == 3 && (
								<Space direction="vertical" size={24}>
									<Paragraph style={{ maxWidth: 400 }}>
										<T keyName="signin.email.complete" params={{ email }}>
											We have sent an email to email with an access link. Follow the link and complete the following
											registration steps.
										</T>
									</Paragraph>

									<Link href="/">
										<Button className="btn-default-on-white" style={{ width: '100%' }}>
											<T>Return to main</T>
										</Button>
									</Link>
								</Space>
							)}
						</Space>
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

export default LoginPage
