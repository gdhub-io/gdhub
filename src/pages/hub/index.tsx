// import { useEffect } from 'react'
import SeasonsList from '@/components/SeasonsList'
import { hasRole } from '@/helpers/user'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { Button, Space } from 'antd'
import Head from 'next/head'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import styles from './style.module.scss'

const HubPage: NextPageWithLayout = () => {
	const session: any = useSession()

	return (
		<>
			<Head>
				<title>Game Developers Hub</title>
			</Head>
			<div className={styles.container}>
				{session && !hasRole('member', session) && (
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
				{hasRole('member', session) && (
					<>
						<SeasonsList />
					</>
				)}
			</div>
		</>
	)
}

HubPage.getLayout = (page) => <ProtectedLayout>{page}</ProtectedLayout>

export default HubPage
