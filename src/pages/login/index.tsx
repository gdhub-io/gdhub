import { useState } from 'react'
import { Button, Image, Space } from 'antd'
import { NextPage } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { signIn } from 'next-auth/react'
import { FcGoogle } from 'react-icons/fc'
import { GoChevronLeft } from 'react-icons/go'
import styles from './style.module.scss'
import LogingImageSrc from '@/assets/images/login-image.jpg'

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
				<title>Войти в Game Developers Hub</title>
			</Head>
			<div className={styles.container}>
				<div className="login-box">
					<div className="illustration-wrapper">
						<Image src={LogingImageSrc.src} alt="Login" preview={false} />
					</div>
					<div className="login-form">
						<p className="form-title">Вход на портал</p>
						<p>Game Developers Hub</p>

						<Space direction="vertical" size="large">
							<Button
								type="primary"
								onClick={() => signIn('google', { callbackUrl: '/hub' }, { prompt: 'select_account consent' })}
							>
								<Space className="login-button">
									<FcGoogle size={16} /> Войти с помощью Google
								</Space>
							</Button>
							<Link href="/">
								<Button type="text" icon={<GoChevronLeft />}>
									Вернуться на главную
								</Button>
							</Link>
						</Space>
					</div>
				</div>
			</div>
		</>
	)
}

export default LoginPage
