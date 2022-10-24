import { useEffect } from 'react'
import { Avatar, Button, Dropdown, Grid, Layout, Menu, Row, Space } from 'antd'
import { signOut, useSession } from 'next-auth/react'
import Image from 'next/future/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import styles from './style.module.less'

const { Header, Footer, Content } = Layout

export const ProtectedLayout = ({ children }: any) => {
	const router = useRouter()
	const screens = Grid.useBreakpoint()
	const { data: session, status } = useSession()

	const userMenu = (
		<Menu
			items={[
				{
					label: (
						<Link href="/profile">
							<a>Профиль</a>
						</Link>
					),
					key: 'profile',
				},
				{
					label: 'Выйти',
					key: 'logout',
					onClick: () => signOut(),
				},
			]}
		/>
	)

	useEffect(() => {
		console.log('session', status, session)
		if (!session && status !== 'loading') router.push('/')
	}, [session])

	return (
		<Layout className={styles.container}>
			<Header>
				<Row align="middle" justify="space-between">
					<Link href="/hub">
						<a className="logo">Game Developers Hub</a>
					</Link>
					{!!session && (
						<Dropdown overlay={userMenu} trigger={['click']}>
							<Button type="link" size="large">
								<Space>
									{screens.sm && <div className="username">{session.user?.name}</div>}
									<Avatar
										src={
											session.user?.image ? (
												<Image src={session.user.image} width={32} height={32} alt="avatar" />
											) : null
										}
										shape="square"
									/>
								</Space>
							</Button>
						</Dropdown>
					)}
				</Row>
			</Header>
			<Content>
				<div className="layout-background">{children}</div>
			</Content>
			<Footer></Footer>
		</Layout>
	)
}
