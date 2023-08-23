// import { useEffect } from 'react'
import { useEffect } from 'react'
import { IndieList } from '@/components/IndieList'
import SeasonsList from '@/components/SeasonsList'
import { hasRole } from '@/helpers/user'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { UserRole } from '@prisma/client'
import { Button, Space } from 'antd'
import Head from 'next/head'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import styles from './style.module.scss'

const HubPage: NextPageWithLayout = () => {
	const session = useSession()

	useEffect(() => {
		console.log('session', session, hasRole(UserRole.Member, session))
	}, [session])

	return (
		<>
			<Head>
				<title>Game Developers Hub</title>
			</Head>
			<div className={styles.container}>
				{session.status == 'authenticated' && !hasRole(UserRole.Member, session) && (
					<Space direction="vertical">
						<p>
							Для того, чтобы стать участников Хаба, необходимо заполнить данные о себе, указать ваши специальности,
							предпочтения в играх, а также указать время, которое вы готовы использовать на участие в проектах. Для
							этого перейдите в ваш Профиль и укажите требуемые данные.
							<br />А также не забудьте присоединиться к чату сообщества{' '}
							<Link href="https://t.me/+HD91s6-i7uAwZDIy" target="_blank">
								по данной ссылке
							</Link>
							.
						</p>
						<Link href="/profile">
							<Button>Мой профиль</Button>
						</Link>
					</Space>
				)}
				{session.status == 'authenticated' && hasRole(UserRole.Member, session) && (
					<>
						<SeasonsList />
						<IndieList />
					</>
				)}
			</div>
		</>
	)
}

HubPage.getLayout = (page) => <ProtectedLayout>{page}</ProtectedLayout>

export default HubPage
