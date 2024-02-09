import { useEffect } from 'react'
import { IndieList } from '@/components/IndieList'
import SeasonsList from '@/components/SeasonsList'
import { hasRole } from '@/helpers/user'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { UserRole } from '@prisma/client'
import { Button, Flex, Space } from 'antd'
import Head from 'next/head'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { CiLock } from 'react-icons/ci'
import styles from './style.module.scss'

const HubPage: NextPageWithLayout = () => {
	const session = useSession()

	useEffect(() => {
		console.log('session', session, hasRole(UserRole.Member, session))
	}, [session])

	return (
		<ProtectedLayout>
			<Head>
				<title>Game Developers Hub</title>
			</Head>
			<div className={styles.container}>
				<Flex justify="end">
					<Button type="primary" disabled>
						<Space>
							Add Project <CiLock style={{ display: 'block' }} />
						</Space>
					</Button>
				</Flex>
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
		</ProtectedLayout>
	)
}

export default HubPage
