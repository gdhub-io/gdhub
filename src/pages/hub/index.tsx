import { ProtectedLayout } from '@layouts/ProtectedLayout'
import { NextPageWithLayout } from 'pages/_app'
import { Button, Space } from 'antd'
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
				<p>
					Для того, чтобы стать участников Хаба, необходимо заполнить данные о себе, указать ваши специальности,
					предпочтения в играх, а также указать время, которое вы готовы использовать на участие в проектах. Для этого
					перейдите в ваш Профиль и укажите требуемые данные.
				</p>
				<Space>
					<Link href="/profile">
						<Button>Мой профиль</Button>
					</Link>
					{hasRole('member') && (
						<>
							<Link href="/hub/members">
								<Button>Участники</Button>
							</Link>
							<Link href="/hub/docs">
								<Button>Полезные материалы</Button>
							</Link>
						</>
					)}
				</Space>
			</Space>
		</>
	)
}

HubPage.getLayout = (page) => <ProtectedLayout>{page}</ProtectedLayout>

export default HubPage
