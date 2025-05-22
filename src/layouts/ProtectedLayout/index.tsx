import { ReactNode, useEffect, useMemo, useState } from 'react'
import GdhubLogo from '@/assets/images/gdhub-beta-black-logo.svg'
import { NotificationsBell } from '@/components/NotificationsBell'
import { appThemeConfig } from '@/config/theme'
import { hasRole } from '@/helpers/user'
import { useTelegram } from '@/helpers/useTelegram'
import { ArrowLeftOutlined } from '@ant-design/icons'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { AiOutlineClose } from '@react-icons/all-files/ai/AiOutlineClose'
import { AiOutlineMenu } from '@react-icons/all-files/ai/AiOutlineMenu'
import { GoLinkExternal } from '@react-icons/all-files/go/GoLinkExternal'
import { RxSlash } from '@react-icons/all-files/rx/RxSlash'
import { T, useTolgee } from '@tolgee/react'
import {
	Avatar,
	Button,
	Col,
	ConfigProvider,
	Drawer,
	Dropdown,
	Flex,
	Grid,
	Layout,
	Menu,
	MenuProps,
	Row,
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
import styles from './style.module.scss'

interface ProtectedLayoutProps {
	children: ReactNode
	title?: string
	subTitle?: string
	seo?: NextSeoProps
	backgroundImage?: string
	showBackButton?: boolean
	projectName?: string
	extra?: ReactNode
}

const { Header, Content } = Layout
const { Title, Text } = Typography

export const ProtectedLayout = ({
	title,
	subTitle,
	seo,
	children,
	showBackButton = false,
	extra,
}: ProtectedLayoutProps) => {
	const router = useRouter()
	const { t, getLanguage, changeLanguage } = useTolgee()
	const [openMobileMenu, setOpenMobileMenu] = useState(false)
	const [isOpenedInTelegram] = useTelegram()
	const screens = Grid.useBreakpoint()
	const { data: session } = useSession()

	const seoSettings: NextSeoProps = {
		title,
		description: subTitle,
		canonical: process.env.NEXT_PUBLIC_APP_URI + router.asPath,
		nofollow: true,
		noindex: true,
		...seo,
	}

	useEffect(() => {
		const unsetOverflow = () => {
			if (typeof window !== 'undefined') {
				const body = document?.querySelector('body')
				body?.style.setProperty('overflow', 'unset')
			}
		}

		unsetOverflow()
	}, [])

	useEffect(() => {
		if (session?.user.lang) changeLanguage(session.user.lang).then((d) => console.log('language is changed'))
	}, [session?.user.lang])

	useEffect(() => {
		if (!screens.lg) setOpenMobileMenu(false)
	}, [session, screens])

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

		switch (getLanguage()) {
			case 'en':
				link = 'https://t.me/gdhub_en'
				break
			case 'ru':
				link = 'https://t.me/gdhub_io'
				break
		}

		return link
	}, [router])

	let dropdownMenuItems: MenuProps['items'] = useMemo(() => {
		let menu: MenuProps['items'] = []

		if (hasRole(prismaClient.UserRole.Admin, { data: session })) {
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
						<T>User Settings</T>
					</Link>
				),
				key: 'profile',
			},
			{ type: 'divider' },
			{
				key: 'tg-community',
				label: (
					<Link href={linkToChat} target="_blank" title={t('Community Chat')}>
						<Flex justify="space-between" align="center" gap={16}>
							<Text>Community Chat</Text>
							<GoLinkExternal size={12} color="gray" />
						</Flex>
					</Link>
				),
			},
			{
				key: 'website',
				label: (
					<Link href="https://gdhub.io" target="_blank" title="Website">
						<Flex justify="space-between" align="center" gap={16}>
							<Text>Website</Text>
							<GoLinkExternal size={12} color="gray" />
						</Flex>
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

		return screens.lg ? menu : [...inlineMenuItems, { key: 'divider1', type: 'divider' }, ...menu]
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
		// {
		// 	key: '/hub/lectures',
		// 	label: (
		// 		<Link href="/hub/lectures">
		// 			<T keyName="app.user.menu.lectures">Lectures</T>
		// 		</Link>
		// 	),
		// },
		{
			key: '/hub/events',
			disabled: true,
			label: (
				<Link href="/hub/events">
					<T keyName="app.user.menu.events">Events</T>
				</Link>
			),
		},
		{
			key: '/hub/mentors',
			label: (
				<Link href="/hub/mentors">
					<T keyName="app.user.menu.mentors">Mentors</T>
				</Link>
			),
		},
		{
			key: '/profile/settings/general',
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
			<style jsx global>{`
				:root {
					--background-color: #fafafa;
				}
			`}</style>
			<ConfigProvider theme={appThemeConfig} locale={getLanguage() == 'en' ? enLocale : ruLocale}>
				<Layout className={styles.container}>
					<Header className={styles.header}>
						<Row wrap={false} align="middle">
							<Col flex="auto">
								<Flex align="center" justify="start" gap={8}>
									<Link href="/hub" className="logo">
										<GdhubLogo style={{ width: '115px' }} />
									</Link>
									<RxSlash size={24} color="#ededed" style={{ display: 'block' }} />
									<Space>
										<Avatar
											src={
												session?.user?.image ? (
													<Image src={session?.user.image} width={24} height={24} alt="avatar" />
												) : null
											}
											size={24}
										/>
										{screens.sm ? <Text className="username">{session?.user?.name}</Text> : null}
									</Space>
								</Flex>
							</Col>
							<Col flex="none">
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
													shape="circle"
													style={{ display: 'block', padding: 0, lineHeight: 0, borderRadius: '50%' }}
													icon={
														session?.user.image ? (
															<Avatar
																size={32}
																src={
																	session?.user?.image ? (
																		<Image src={session?.user.image} width={32} height={32} alt="avatar" />
																	) : null
																}
															/>
														) : null
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
							</Col>
						</Row>
						<Menu items={menuItems} mode="horizontal" selectedKeys={[router.pathname]} className={styles.appMenu} />
					</Header>
					<Content className={styles.contentContainer}>
						<div className={styles.content}>
							<Flex align="center" justify="space-between" gap={16} style={{ marginBottom: 24 }} wrap={true}>
								<Space>
									{showBackButton && (
										<Button
											type="text"
											icon={<ArrowLeftOutlined />}
											onClick={() => router.back()}
											style={{ padding: 0 }}
										/>
									)}
									{!!title && <Title style={{ margin: 0 }}>{title}</Title>}
								</Space>
								{extra}
							</Flex>

							{!!subTitle && !showBackButton && <div>{subTitle}</div>}
							{!!subTitle && showBackButton && <div style={{ marginLeft: 52 }}>{subTitle}</div>}

							{children}
						</div>
					</Content>
					{/* <Footer></Footer> */}
				</Layout>
				{!screens.lg ? (
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
				) : null}
			</ConfigProvider>
		</>
	)
}
