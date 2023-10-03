import { useEffect, useMemo, useState } from 'react'
import GdhubLogo from '@/assets/images/gdhub-logo.svg'
import { NotificationsBell } from '@/components/NotificationsBell'
import { hasRole } from '@/helpers/user'
import { useTelegram } from '@/helpers/useTelegram'
import { UserRole } from '@prisma/client'
import { Avatar, Button, Drawer, Dropdown, Grid, Layout, Menu, MenuProps, Row, Space, Tooltip } from 'antd'
import Image from 'next/image'
import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'
import { AiOutlineMenu, AiOutlineClose } from 'react-icons/ai'
import { TbBrandTelegram } from 'react-icons/tb'
import styles from './style.module.scss'

const { Header, Footer, Content } = Layout

export const ProtectedLayout = ({ children }: any) => {
	const [openMobileMenu, setOpenMobileMenu] = useState(false)
	const [isOpenedInTelegram] = useTelegram()
	const screens = Grid.useBreakpoint()
	const { data: session }: any = useSession()

	const telegramMenuItem = {
		label: screens.lg ? (
			<Tooltip title="Чат сообщества в Telegram">
				<Link href="https://t.me/+HD91s6-i7uAwZDIy" target="_blank" title="Телеграм-чат сообщества">
					<Button shape="circle" type="text" style={{ top: '6px', position: 'relative' }}>
						<TbBrandTelegram size={24} />
					</Button>
				</Link>
			</Tooltip>
		) : (
			<Link href="https://t.me/+HD91s6-i7uAwZDIy" target="_blank" title="Телеграм-чат сообщества">
				Чат сообщества в Telegram
			</Link>
		),
		key: 'telegram-join-link',
	}

	useEffect(() => {
		console.log(session)
		if (!screens.lg) setOpenMobileMenu(false)
	}, [session, screens])

	const publicMenuItems: any = useMemo(
		() => [
			{
				label: (
					<Link href="/projects" title="Проекты сообщества">
						{screens.lg ? <Button type="text">Проекты</Button> : 'Проекты'}
					</Link>
				),
				key: '/projects',
			},
			{
				label: (
					<Link href="/vacancies" title="Вакансии на инди-проекты">
						{screens.lg ? <Button type="text">Вакансии</Button> : 'Вакансии'}
					</Link>
				),
				key: '/vacancies',
			},
		],
		[screens]
	)

	const inlineMenuItems: MenuProps['items'] = useMemo(() => {
		let menu: MenuProps['items'] = [
			{
				style: { display: screens.lg ? 'none' : 'block' },
				label: (
					<Link href="/hub" title="Главная страница">
						{screens.lg ? <Button type="primary">Главная</Button> : 'Главная'}
					</Link>
				),
				key: '/hub',
			},
			...publicMenuItems,
			{
				label: (
					<Link href="/hub/docs" title="С чего начать">
						{screens.lg ? <Button type="primary">С чего начать</Button> : <strong>С чего начать</strong>}
					</Link>
				),
				key: '/hub/docs',
			},
			telegramMenuItem,
		]

		if (!!session && session?.user?.roles.includes(UserRole.Member)) {
			menu = [
				menu[0],
				{
					label: (
						<Link href="/hub/members" title="Участники сообщества">
							{screens.lg ? <Button type="text">Участники</Button> : 'Участники'}
						</Link>
					),
					key: '/hub/members',
				},
				{
					label: (
						<Link href="/hub/lectures" title="Лекции сообщества">
							{screens.lg ? <Button type="text">Лекции</Button> : 'Лекции'}
						</Link>
					),
					key: '/hub/lectures',
				},
				...menu.slice(1),
			]
		}

		return menu
	}, [screens, session])

	let dropdownMenuItems: MenuProps['items'] = useMemo(() => {
		let menu: MenuProps['items'] = []

		if (hasRole(UserRole.Admin, { data: session })) {
			menu.push({
				label: <Link href="/admin/seasons">Админка</Link>,
				key: '/admin/seasons',
			})
		}

		menu = [
			...menu,
			{
				label: <Link href="/profile">Профиль</Link>,
				key: 'profile',
			},
			{
				label: <Link href="/my/projects">Мои проекты</Link>,
				key: 'projects',
			},
			{
				style: { display: isOpenedInTelegram ? 'none' : 'block' },
				label: 'Выйти',
				key: 'logout',
				danger: true,
				onClick: () => signOut(),
			},
		]

		return screens.lg ? menu : [...inlineMenuItems, { type: 'divider' }, ...menu]
	}, [isOpenedInTelegram, screens, session])

	return (
		<>
			<Layout className={styles.container}>
				<Header className="header">
					<Row align="middle" justify="space-between">
						<Link href="/hub" className="logo">
							<GdhubLogo style={{ width: '120px', height: '31px' }} />
						</Link>
						{
							<>
								{screens.xl ? (
									<>
										{screens.lg && (
											<Menu
												style={{ flex: 1, justifyContent: 'flex-end' }}
												mode="horizontal"
												items={session ? inlineMenuItems : publicMenuItems}
											/>
										)}
										{!!session && (
											<>
												<NotificationsBell />
												<Dropdown menu={{ items: dropdownMenuItems }} trigger={['click']}>
													<Button type="link" size="large">
														<Space>
															{screens.sm && <div className="username">{session?.user?.name}</div>}
															<Avatar
																src={
																	session?.user?.image ? (
																		<Image src={session?.user.image} width={32} height={32} alt="avatar" />
																	) : null
																}
																shape="square"
															/>
														</Space>
													</Button>
												</Dropdown>
											</>
										)}
									</>
								) : (
									<Space>
										<NotificationsBell />
										<Button type="text" onClick={() => setOpenMobileMenu(true)}>
											<AiOutlineMenu />
										</Button>
									</Space>
								)}
							</>
						}
						{!session && (
							<Link href="/signin">
								<Button>Log in</Button>
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
					height={'100%'}
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
							<AiOutlineClose />
						</Button>
					}
				>
					<Menu items={dropdownMenuItems} onSelect={() => setOpenMobileMenu(false)} />
				</Drawer>
			)}
		</>
	)
}
