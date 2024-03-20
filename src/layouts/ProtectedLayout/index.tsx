import { ReactNode, useEffect, useMemo, useState } from 'react'
import GdhubLogo from '@/assets/images/gdhub-beta-black-logo.svg'
import { NotificationsBell } from '@/components/NotificationsBell'
import { appThemeConfig } from '@/config/theme'
import { hasRole } from '@/helpers/user'
import { useTelegram } from '@/helpers/useTelegram'
import { UserRole } from '@prisma/client'
import { T, useTolgee } from '@tolgee/react'
import {
	Avatar,
	Button,
	ConfigProvider,
	Drawer,
	Dropdown,
	Flex,
	FloatButton,
	Grid,
	Layout,
	Menu,
	MenuProps,
	Space,
	Typography,
} from 'antd'
import enLocale from 'antd/locale/en_US'
import ruLocale from 'antd/locale/ru_RU'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { signOut, useSession } from 'next-auth/react'
import { NextSeo, NextSeoProps } from 'next-seo'
import { AiOutlineMenu, AiOutlineClose } from 'react-icons/ai'
import { GoArrowUp } from 'react-icons/go'
import { RxSlash } from 'react-icons/rx'
import ReactNiceAvatar, { genConfig } from 'react-nice-avatar'
import styles from './style.module.scss'

interface ProtectedLayoutProps {
	children: ReactNode
	title?: string
	subTitle?: string
	seo?: NextSeoProps
	backgroundImage?: string
}

const { Header, Content } = Layout
const { Title, Text, Paragraph } = Typography

export const ProtectedLayout = ({ title, subTitle, seo, children }: ProtectedLayoutProps) => {
	const router = useRouter()
	const { t } = useTolgee()
	const [openMobileMenu, setOpenMobileMenu] = useState(false)
	const [isOpenedInTelegram] = useTelegram()
	const screens = Grid.useBreakpoint()
	const { data: session }: any = useSession()

	const seoSettings: NextSeoProps = {
		title,
		description: subTitle,
		canonical: process.env.NEXT_PUBLIC_APP_URI + router.asPath,
		nofollow: true,
		noindex: true,
		...seo,
	}

	useEffect(() => {
		console.log(session)
		if (!screens.lg) setOpenMobileMenu(false)
	}, [session, screens])

	const avatarConfig = useMemo(() => {
		if (!session?.user.email) return

		const config = genConfig(session.user.email)
		config.hairStyle = 'normal'

		return config
	}, [session?.user.email])

	const inlineMenuItems: MenuProps['items'] = useMemo(() => {
		let menu: MenuProps['items'] = [
			{
				style: { display: screens.lg ? 'none' : 'block' },
				label: (
					<Link href="/hub" title={t('Home')}>
						{screens.lg ? (
							<Button type="primary" size="small">
								<T>Home</T>
							</Button>
						) : (
							<T>Home</T>
						)}
					</Link>
				),
				key: '/hub',
			},

			{
				label: (
					<Link href="/hub/docs">
						{screens.lg ? <Button size="small">Documentation</Button> : <strong>Documentation</strong>}
					</Link>
				),
				key: '/hub/docs',
			},
		]

		return menu
	}, [screens, session])

	const linkToChat = useMemo(() => {
		let link = ''

		switch (router.locale) {
			case 'en':
				link = 'https://discord.gg/WcUFD3tHqg'
				break
			case 'ru':
				link = 'https://t.me/+HD91s6-i7uAwZDIy'
				break
		}

		return link
	}, [router])

	let dropdownMenuItems: MenuProps['items'] = useMemo(() => {
		let menu: MenuProps['items'] = []

		if (hasRole(UserRole.Admin, { data: session })) {
			menu.push({
				label: (
					<Link href="/admin/seasons">
						<T>Administration</T>
					</Link>
				),
				key: '/admin/seasons',
			})
		}

		menu = [
			...menu,
			{
				label: (
					<Link href="/profile">
						<T>Profile</T>
					</Link>
				),
				key: 'profile',
			},
			{ type: 'divider' },
			{
				key: 'tg-community',
				label: (
					<Link href={linkToChat} target="_blank" title={t('Community Chat')}>
						<T>Community Chat</T>
					</Link>
				),
			},
			{ type: 'divider' },
			{
				style: { display: isOpenedInTelegram ? 'none' : 'block' },
				label: t('Sign out'),
				key: 'logout',
				danger: true,
				onClick: () => signOut({ redirect: true, callbackUrl: '/' }),
			},
		]

		return screens.lg ? menu : [...inlineMenuItems, { type: 'divider' }, ...menu]
	}, [isOpenedInTelegram, screens, session])

	const menuItems: MenuProps['items'] = [
		{
			key: '/hub',
			label: (
				<Link href="/hub">
					<T keyName="app.user.menu.hub">Overview</T>
				</Link>
			),
		},
		{
			key: '/hub/vacancies',
			label: (
				<Link href="/hub/vacancies">
					<T keyName="app.user.menu.vacancies">Vacancies</T>
				</Link>
			),
		},
		{
			key: '/hub/members',
			label: (
				<Link href="/hub/members">
					<T keyName="app.user.menu.members">Members</T>
				</Link>
			),
		},
		{
			key: '/hub/projects',
			label: (
				<Link href="/hub/projects">
					<T keyName="app.user.menu.projects">Projects</T>
				</Link>
			),
		},
		{
			key: '/hub/lectures',
			label: (
				<Link href="/hub/lectures">
					<T keyName="app.user.menu.lectures">Lectures</T>
				</Link>
			),
		},
		{
			key: '/experts',
			disabled: true,
			label: <T keyName="app.user.menu.mentors">Mentors</T>,
		},
		{
			key: '/profile',
			label: (
				<Link href="/profile">
					<T keyName="app.user.menu.settings">Settings</T>
				</Link>
			),
		},
	]

	return (
		<>
			<NextSeo {...seoSettings} />
			<ConfigProvider theme={appThemeConfig} locale={router.locale == 'en' ? enLocale : ruLocale}>
				<style jsx global>{`
					:root {
						--background-color: #fafafa;
					}
				`}</style>
				<Layout className={styles.container}>
					<Header className={styles.header}>
						<Flex align="middle" justify="space-between">
							<Space align="center" size={8}>
								<Link href="/hub" className="logo">
									<GdhubLogo style={{ width: '115px' }} />
								</Link>
								<RxSlash size={24} color="#ededed" style={{ display: 'block' }} />
								<Space>
									{session?.user?.image ? (
										<Avatar
											src={
												session?.user?.image ? (
													<Image src={session?.user.image} width={24} height={24} alt="avatar" />
												) : null
											}
											size={24}
										/>
									) : (
										<ReactNiceAvatar style={{ width: 24, height: 24 }} {...avatarConfig} />
									)}
									{screens.sm && <Text className="username">{session?.user?.name}</Text>}
								</Space>
							</Space>
							<Space>
								{screens.xl ? (
									<>
										<Link href="/hub/docs">
											<Button type="text" style={{ fontSize: 14 }}>
												<T>Documentation</T>
											</Button>
										</Link>
										<NotificationsBell />
										<Dropdown menu={{ items: dropdownMenuItems }} trigger={['click']}>
											<Button
												type="text"
												style={{ display: 'block', padding: 0 }}
												icon={
													session?.user.image ? (
														<Avatar
															src={
																session?.user?.image ? (
																	<Image src={session?.user.image} width={32} height={32} alt="avatar" />
																) : null
															}
														/>
													) : (
														<ReactNiceAvatar style={{ width: '32px', height: '32px' }} {...avatarConfig} />
													)
												}
											></Button>
										</Dropdown>
									</>
								) : (
									<>
										<NotificationsBell />
										<Button type="text" size="small" onClick={() => setOpenMobileMenu(true)}>
											<AiOutlineMenu />
										</Button>
									</>
								)}
							</Space>
						</Flex>
						{/* <Tabs defaultActiveKey="1" items={menuItems} onChange={() => {}} /> */}
						<Menu items={menuItems} mode="horizontal" selectedKeys={[router.pathname]} className={styles.appMenu} />
					</Header>
					<Content className={styles.contentContainer}>
						<div className={styles.content}>
							<Space size={0} direction="vertical" style={{ marginBottom: 32 }}>
								{!!title && <Title>{title}</Title>}
								{!!subTitle && <Paragraph>{subTitle}</Paragraph>}
							</Space>
							{children}
						</div>
					</Content>
					{/* <Footer></Footer> */}
				</Layout>
				{!screens.lg && (
					<Drawer
						className={styles.mobileMenuDrawer}
						height={'100%'}
						title={
							<Space>
								<Avatar
									src={
										session?.user?.image ? (
											<Image src={session?.user.image} width={32} height={32} alt="avatar" />
										) : null
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
				<FloatButton.BackTop icon={<GoArrowUp />} rootClassName={styles.backTop} description="Scroll to up" />
			</ConfigProvider>
		</>
	)
}
