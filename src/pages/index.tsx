import styles from '@styles/home.module.less'
import { Button, Space } from 'antd'
import { NextPage } from 'next'
import { unstable_getServerSession } from 'next-auth'
import { useSession, signIn } from 'next-auth/react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { FcGoogle } from 'react-icons/fc'
import { authOptions } from './api/auth/[...nextauth]'

const Home: NextPage = ({ course, recruitmentGroups, webinarStartedAt }: any) => {
	const router = useRouter()
	const { data: session } = useSession()

	return (
		<>
			<Head>
				<title>Home Page</title>
			</Head>
			<div className={styles.container}>
				<Space direction="vertical" align="center">
					<h1>Game Developers Hub</h1>
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
