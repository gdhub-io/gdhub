import { useContext, useEffect } from 'react'
import { NextPage } from 'next'
import { useSession, signIn, signOut } from 'next-auth/react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { AuthContext } from './_app'
import { Button } from 'antd'
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
				<h1>Game Developers Hub</h1>
				<Button
					type="primary"
					icon={<FcGoogle />}
					onClick={() => signIn('google', {}, { prompt: 'select_account consent' })}
				>
					Sign in with Google
				</Button>
			</div>
		</>
	)
}

export default Home
