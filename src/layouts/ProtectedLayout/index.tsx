import { useEffect, useState } from 'react'
import GdhubLogo from '@assets/images/gdhub-icon.svg'
import { Avatar, Button, Dropdown, Grid, Layout, Menu, Row, Space } from 'antd'
import { signOut, useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import styles from './style.module.less'

const { Header, Footer, Content } = Layout

export const ProtectedLayout = ({ children }: any) => {
	const router = useRouter()
	const screens = Grid.useBreakpoint()
	const { data: session, status }: any = useSession()
	const [headerMenuItems, setHeaderMenuItems] = useState([
		{
			label: (
				<Link href="/hub/docs">
					<Button type="primary">С чего начать</Button>
				</Link>
			),
			key: '/hub/docs',
		},
	])

	useEffect(() => {
		if (!!session && session?.user?.roles.includes('member')) {
			setHeaderMenuItems([
				{
					label: (
						<Link href="/hub/members">
							<Button type="text">Участники</Button>
						</Link>
					),
					key: '/hub/members',
				},
				{
					label: (
						<Link href="/hub/docs">
							<Button type="primary">С чего начать</Button>
						</Link>
					),
					key: '/hub/docs',
				},
			])
		}
	}, [session])

	const userMenu = (
		<Menu
			items={[
				{
					label: <Link href="/profile">Профиль</Link>,
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

	return (
		<Layout className={styles.container}>
			<Header>
				<Row align="middle" justify="space-between" className="header-wrapper">
					<Link href="/hub" className="logo">
						<GdhubLogo style={{ width: '32px', height: '32px' }} /> Game Developers Hub
					</Link>
					{!!session && (
						<>
							<Menu style={{ flex: 1, justifyContent: 'flex-end' }} mode="horizontal" items={headerMenuItems} />
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
						</>
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
