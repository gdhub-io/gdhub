import { useState } from 'react'
import LogingBgImage from '@/assets/images/login-bg.jpg'
import { authOptions } from '@/pages/api/auth/[...nextauth]'
import { Button, Space, Typography } from 'antd'
import { NextPage } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { getServerSession } from 'next-auth'
import { signIn } from 'next-auth/react'
import { FaGoogle } from 'react-icons/fa'
import styles from './style.module.scss'

const { Paragraph } = Typography

declare global {
	interface Window {
		$crisp?: any
	}
}

const LoginPage: NextPage = () => {
	const router = useRouter()
	const [signInProcessing, setSignInProcessing] = useState(false)

	return (
		<>
			<Head>
				<title>Sign in</title>
			</Head>
			<div className={styles.container} style={{ backgroundImage: `url(${LogingBgImage.src})` }}>
				<div className="login-box">
					<div className="login-form">
						<p className="form-title">Log in</p>

						<Space direction="vertical" size="large">
							<Button
								type="primary"
								icon={<FaGoogle size={16} />}
								onClick={() => signIn('google', { callbackUrl: '/hub' }, { prompt: 'select_account consent' })}
							>
								Log in with Google
							</Button>
							<Link href="/">
								<Button className="btn-default-on-white">Вернуться на главную</Button>
							</Link>
						</Space>
						<Paragraph>We use Cookie policy to improve our website and offer a personalised experience.</Paragraph>
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
