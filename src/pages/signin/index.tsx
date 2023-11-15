import { useState } from 'react'
import LogingBgImage from '@/assets/images/login-bg.jpg'
import { authOptions } from '@/pages/api/auth/[...nextauth]'
import { Button, Space, Typography, Form, Input, message } from 'antd'
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

const LoginPage: NextPage = () => {
	const [form] = Form.useForm()
	const [loginStep, setLoginStep] = useState(1)
	const [email, setEmail] = useState<string>()
	const [submitting, setSubmitting] = useState<boolean>(false)

	const handleSend = async () => {
		setSubmitting(true)

		const { email } = await form.validateFields()
		const response = await signIn('email', { email, redirect: false })

		setSubmitting(false)
		setEmail(email)

		if (response?.ok) setLoginStep(3)
		if (response?.error) message.error(response?.error)
	}

	return (
		<>
			<Head>
				<title>Sign in</title>
			</Head>
			<div className={`${styles.container} bright-container`} style={{ backgroundImage: `url(${LogingBgImage.src})` }}>
				<div className="login-box">
					<div className="login-form">
						<Space direction="vertical" size={40}>
							{loginStep < 3 && <Title>Log in</Title>}
							{loginStep == 1 && (
								<>
									<Space direction="vertical" size={24}>
										<Button type="primary" style={{ width: '100%' }} onClick={() => setLoginStep(2)}>
											Log in with email
										</Button>
										<Button
											type="primary"
											style={{ width: '100%' }}
											icon={<FaGoogle size={16} />}
											onClick={() => signIn('google', { callbackUrl: '/hub' }, { prompt: 'select_account consent' })}
										>
											Log in with Google
										</Button>
										<Link href="/registration" className={styles.createAccountLink}>
											Create new account
										</Link>
										<Link href="/">
											<Button className="btn-default-on-white" style={{ width: '100%' }}>
												Return to main
											</Button>
										</Link>
									</Space>
								</>
							)}

							{loginStep == 2 && (
								<>
									<Space direction="vertical" size={24}>
										<Paragraph>We will send a letter to email with a link to log into your account</Paragraph>

										<Form form={form} layout="vertical">
											<Form.Item
												name="email"
												label="Enter Email"
												rules={[{ type: 'email', required: true, message: 'Please enter Email' }]}
											>
												<Input />
											</Form.Item>
										</Form>

										<Space size={24}>
											<Button type="primary" onClick={handleSend} loading={submitting}>
												Send link to email
											</Button>
											<Button type="link" onClick={() => setLoginStep(1)}>
												Back
											</Button>
										</Space>
									</Space>
								</>
							)}

							{loginStep == 3 && (
								<Space direction="vertical" size={24}>
									<Paragraph style={{ maxWidth: 400 }}>
										We have sent an email to {email} with an access link. Follow the link and complete the following
										registration steps.
									</Paragraph>

									<Link href="/">
										<Button className="btn-default-on-white" style={{ width: '100%' }}>
											Return to main
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
