import { useEffect } from 'react'
import { Button, Space } from 'antd'
import { NextPage } from 'next'
import { useSession, signIn } from 'next-auth/react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { FcGoogle } from 'react-icons/fc'

const Home: NextPage = ({ course, recruitmentGroups, webinarStartedAt }: any) => {
	const router = useRouter()
	const { data: session } = useSession()

	useEffect(() => {
		if (session) router.push('/hub')
	}, [session])

	return (
		<>
			<Head>
				<title>Home Page</title>
			</Head>
			<div className="flex-column flex justify-center items-center h-screen">
				<Space direction="vertical" align="center">
					<h1>Game Developers Hub</h1>
					<Button type="primary" onClick={() => signIn('google', {}, { prompt: 'select_account consent' })}>
						<Space align="center">
							<FcGoogle /> Sign in with Google
						</Space>
					</Button>
				</Space>
			</div>
		</>
	)
}

export default Home
