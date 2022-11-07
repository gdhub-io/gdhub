import GdhubLogo from '@assets/images/gdhub-icon.svg'
import styles from '@styles/home.module.less'
import { Button, Space } from 'antd'
import { NextPage } from 'next'
import { unstable_getServerSession } from 'next-auth'
import { signIn } from 'next-auth/react'
import Head from 'next/head'
import { FcGoogle } from 'react-icons/fc'
import { authOptions } from './api/auth/[...nextauth]'

const Home: NextPage = () => {
	return (
		<>
			<Head>
				<title>Home Page</title>
			</Head>
			<div className={styles.container}>
				<Space direction="vertical" align="center" size="large">
					<div className="logo">
						<GdhubLogo style={{ width: '32px', height: '32px' }} /> Game Developers Hub
					</div>
					<p>
						Сообщество специалистов игровой индустрии, участники которого объеденяются в команды, чтобы разрабатывать
						новые игры.
						<br />
						Хочешь получить новый опыт или разработать свою игру? Присоеденяйся!
					</p>
					<Button type="primary" onClick={() => signIn('google', {}, { prompt: 'select_account consent' })}>
						<Space className="login-button">
							<FcGoogle size={16} /> Sign in with Google
						</Space>
					</Button>
				</Space>
			</div>
		</>
	)
}

export async function getServerSideProps(context: any) {
	const session: any = await unstable_getServerSession(context.req, context.res, authOptions)

	if (session?.user?.id) {
		return {
			redirect: {
				destination: '/hub',
				permanent: false,
			},
		}
	}

	return { props: {} }
}

export default Home
