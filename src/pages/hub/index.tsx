import { ProtectedLayout } from '@layouts/ProtectedLayout'
import { NextPageWithLayout } from 'pages/_app'
import { Space } from 'antd'
import { useSession } from 'next-auth/react'
import Head from 'next/head'
import Link from 'next/link'

const HubPage: NextPageWithLayout = () => {
	const { data: session }: any = useSession()

	const hasRole = (roleName: string) => {
		if (!session?.user) {
			return false
		}

		const role = session.user.roles.find((role: string) => role === roleName.toLowerCase())

		return role ? true : false
	}

	return (
		<>
			<Head>
				<title>Game Developers Hub</title>
			</Head>
			<Space direction="vertical">
				<Link href="/profile">
					<a>Мой профиль</a>
				</Link>
				{hasRole('member') && (
					<Link href="/hub/specialists">
						<a>Участники</a>
					</Link>
				)}
			</Space>
		</>
	)
}

HubPage.getLayout = (page) => <ProtectedLayout>{page}</ProtectedLayout>

export default HubPage
