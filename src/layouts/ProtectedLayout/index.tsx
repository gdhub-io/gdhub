import { useEffect, useState } from 'react'
import GdhubLogo from '@assets/images/gdhub-icon.svg'
import { useTelegram } from '@helpers/useTelegram'
import { MenuOutlined, CloseOutlined } from '@ant-design/icons'
import { Avatar, Button, Drawer, Dropdown, Grid, Layout, Menu, Row, Space, Tooltip } from 'antd'
import { signOut, useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { TbBrandTelegram } from 'react-icons/tb'
import styles from './style.module.less'

const { Header, Footer, Content } = Layout

export const ProtectedLayout = ({ children }: any) => {
	const [openMobileMenu, setOpenMobileMenu] = useState(false)
	const [isOpenedInTelegram] = useTelegram()
	const screens = Grid.useBreakpoint()
	const { data: session, status }: any = useSession()

	const telegramMenuItem = {
		label: screens.lg ? (
			<Tooltip title="Чат сообщества в Telegram">
				<Link href="https://t.me/+HD91s6-i7uAwZDIy" target="_blank">
					<Button shape="circle" type="text" style={{ top: '6px', position: 'relative' }}>
						<TbBrandTelegram size={24} />
					</Button>
				</Link>
			</Tooltip>
		) : (
			<Link href="https://t.me/+HD91s6-i7uAwZDIy" target="_blank">
				Чат сообщества в Telegram
			</Link>
		),
		key: 'telegram-join-link',
	}

	const [headerMenuItems, setHeaderMenuItems] = useState([
		{
			label: (
				<Link href="/hub">
					<Button type="primary">Главная</Button>
				</Link>
			),
			key: '/hub',
		},
		{
			label: (
				<Link href="/hub/docs">
					<Button type="primary">С чего начать</Button>
				</Link>
			),
			key: '/hub/docs',
		},
		telegramMenuItem,
	])

	useEffect(() => {
		if (!screens.lg) setOpenMobileMenu(false)

		if (!!session && session?.user?.roles.includes('member')) {
			setHeaderMenuItems([
				{
					label: <Link href="/hub/members">{screens.lg ? <Button type="text">Участники</Button> : 'Участники'}</Link>,
					key: '/hub/members',
				},
				{
					label: <Link href="/hub/lectures">{screens.lg ? <Button type="text">Лекции</Button> : 'Лекции'}</Link>,
					key: '/hub/lectures',
				},
				{
					label: (
						<Link href="/hub/docs">
							{screens.lg ? <Button type="primary">С чего начать</Button> : <strong>С чего начать</strong>}
						</Link>
					),
					key: '/hub/docs',
				},
				telegramMenuItem,
			])
		}
	}, [session, screens])

	let userMenuItems = [
		{
			label: <Link href="/profile">Профиль</Link>,
			key: 'profile',
		},
		{
			label: <Link href="/my/projects">Мои проекты</Link>,
			key: 'projects',
		},
		{
			label: 'Выйти',
			key: 'logout',
			danger: true,
			onClick: () => signOut(),
		},
	]

	if (isOpenedInTelegram) {
		userMenuItems = userMenuItems.slice(0, userMenuItems.length - 3)
	}

	return (
		<>
			<Layout className={styles.container}>
				<Header>
					<Row align="middle" justify="space-between" className="header-wrapper">
						<Link href="/hub" className="logo">
							<GdhubLogo style={{ width: '32px', height: '32px' }} /> Game Developers Hub
						</Link>
						{!!session && (
							<>
								{screens.lg ? (
									<>
										<Menu style={{ flex: 1, justifyContent: 'flex-end' }} mode="horizontal" items={headerMenuItems} />
										<Dropdown overlay={<Menu items={userMenuItems} />} trigger={['click']}>
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
								) : (
									<div>
										<Button type="text" onClick={() => setOpenMobileMenu(true)}>
											<MenuOutlined />
										</Button>
									</div>
								)}
							</>
						)}
						{!session && (
							<Link href="/">
								<Button type="primary">Регистрация</Button>
							</Link>
						)}
					</Row>
				</Header>
				<Content>
					<div className="layout-background">{children}</div>
				</Content>
				<Footer></Footer>
			</Layout>
			{!screens.lg && (
				<Drawer
					className={styles.mobileMenuDrawer}
					title={
						<Space>
							<Avatar
								src={
									session?.user?.image ? <Image src={session.user.image} width={32} height={32} alt="avatar" /> : null
								}
								shape="square"
							/>
							<div className="username">{session?.user?.name}</div>
						</Space>
					}
					placement="top"
					onClose={() => setOpenMobileMenu(false)}
					open={openMobileMenu}
					extra={
						<Button onClick={() => setOpenMobileMenu(false)} type="text">
							<CloseOutlined />
						</Button>
					}
				>
					<Menu items={[...headerMenuItems, ...userMenuItems]} onSelect={() => setOpenMobileMenu(false)} />
				</Drawer>
			)}
		</>
	)
}
