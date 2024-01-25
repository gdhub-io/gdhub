import { useEffect, useMemo, useState } from 'react'
import GdhubLogo from '@/assets/images/gdhub-logo-v2.svg'
import { publicThemeConfig } from '@/config/theme'
import { hasRole } from '@/helpers/user'
import { useTelegram } from '@/helpers/useTelegram'
import { UserRole } from '@prisma/client'
import { T } from '@tolgee/react'
import {
	Avatar,
	Button,
	Col,
	ConfigProvider,
	Drawer,
	Dropdown,
	Grid,
	Layout,
	Menu,
	MenuProps,
	Row,
	Space,
	Tooltip,
	Typography,
} from 'antd'
import enLocale from 'antd/locale/en_US'
import ruLocale from 'antd/locale/ru_RU'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { signOut, useSession } from 'next-auth/react'
import { AiOutlineMenu, AiOutlineClose } from 'react-icons/ai'
import { BsDiscord, BsMailbox, BsTelegram } from 'react-icons/bs'
import { TbBrandTelegram } from 'react-icons/tb'
import styles from './style.module.scss'

const { Header, Footer, Content } = Layout
const { Paragraph, Text, Title } = Typography

export const PublicLayout = ({ children }: any) => {
	const router = useRouter()
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
					<Link href="/projects" title="Projects">
						{screens.lg ? <Button type="text">Projects</Button> : 'Проекты'}
					</Link>
				),
				key: '/projects',
			},
			{
				label: (
					<Link href="/vacancies" title="Vacancies">
						{screens.lg ? <Button type="text">Vacancies</Button> : 'Вакансии'}
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
		<ConfigProvider theme={publicThemeConfig} locale={router.locale == 'en' ? enLocale : ruLocale}>
			<Layout className={styles.container}>
				<Header className={styles.header}>
					<Row align="middle" justify="space-between" className={styles.headerContainer}>
						<Link href="/" className="logo">
							<GdhubLogo style={{ width: '156px', height: '42px' }} />
						</Link>
						{
							<>
								{screens.xl ? (
									<>
										{screens.lg && (
											<Menu
												style={{ flex: 1, justifyContent: 'center' }}
												mode="horizontal"
												items={session ? inlineMenuItems : publicMenuItems}
											/>
										)}
										{!!session && (
											<>
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
				<Footer>
					<Space direction="vertical" align="center" style={{ width: '100%' }}>
						<Paragraph>Contacts</Paragraph>
						<Title level={2}>Get in touch</Title>
						<Paragraph>Join us and become a part of new era in the gaming industry!</Paragraph>
						<Row>
							<Col>
								<Space direction="vertical" align="center">
									<div>
										<BsMailbox />
									</div>
									<Text>Email</Text>
									<Text>info@gdhub.io</Text>
								</Space>
							</Col>
							<Col>
								<Space direction="vertical" align="center">
									<div>
										<BsTelegram />
									</div>
									<Text>Telegram</Text>
									<Text>Game Developers Hub</Text>
								</Space>
							</Col>
							<Col>
								<Space direction="vertical" align="center">
									<div>
										<BsDiscord />
									</div>
									<Text>Discord</Text>
									<Text>Game Developers Hub</Text>
								</Space>
							</Col>
						</Row>
					</Space>

					<Row>
						<Col span={12}>
							<GdhubLogo style={{ width: '100px' }} />
							<Paragraph>
								<T keyName="app-short-description">
									A community of game industry professionals whose members form teams to develop new games. Do you want
									to get a new experience or develop your own game? Join now!
								</T>
							</Paragraph>
						</Col>
						<Col span={4}>
							<Space direction="vertical">
								<Title level={5}>
									<T>Company</T>
								</Title>
								<Text>
									<T>About us</T>
								</Text>
							</Space>
						</Col>
						<Col span={4}>
							<Space direction="vertical">
								<Title level={5}>
									<T>For Users</T>
								</Title>
								<Text>
									<T>For Authors</T>
								</Text>
								<Text>
									<T>For Specialists</T>
								</Text>
							</Space>
						</Col>
						<Col span={4}>
							<Space direction="vertical">
								<Title level={5}>
									<T>Support</T>
								</Title>
								<Text>
									<T>Cookie Policy</T>
								</Text>
							</Space>
						</Col>
					</Row>
				</Footer>
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
		</ConfigProvider>
	)
}
