import { ReactNode, useEffect, useMemo, useState } from 'react'
import GdhubLogo from '@/assets/images/gdhub-logo-v2b.svg'
import { Error404 } from '@/components/Error404'
import { NotificationsBell } from '@/components/NotificationsBell'
import { appThemeConfig } from '@/config/theme'
import { ContextProject, ProjectContext } from '@/contexts/ProjectContext'
import { hasRole } from '@/helpers/user'
import { useTelegram } from '@/helpers/useTelegram'
import { useCurrentProject } from '@/hooks/project'
import { UserRole } from '@prisma/client'
import { T } from '@tolgee/react'
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
import { ProtectedLayout } from '../ProtectedLayout'

const { Header, Content } = Layout
const { Title, Text, Paragraph } = Typography

export const ProtectedProjectLayout = ({
	title,
	seo,
	children,
}: {
	title?: string
	seo?: NextSeoProps
	children: ReactNode
}) => {
	const router = useRouter()
	const projectSlug = router.query.slug as string
	const [contextProject, setContextProject] = useState<ContextProject>()
	const [openMobileMenu, setOpenMobileMenu] = useState(false)
	const [isOpenedInTelegram] = useTelegram()
	const screens = Grid.useBreakpoint()
	const { data: session }: any = useSession()

	const { project, isFetched } = useCurrentProject()

	useEffect(() => {
		if (!project) return

		setContextProject({ id: project.id, name: project.name, teamId: project.teamId })
	}, [project])

	const seoSettings: NextSeoProps = {
		title: title || 'Project',
		canonical: process.env.NEXT_PUBLIC_APP_URI + router.asPath,
		nofollow: true,
		noindex: true,
		...seo,
	}

	useEffect(() => {
		console.log('router', router)
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
					<Link href="/hub" title="Главная страница">
						{screens.lg ? (
							<Button type="primary" size="small">
								Главная
							</Button>
						) : (
							'Главная'
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
			{ type: 'divider' },
			{
				key: 'tg-community',
				label: (
					<Link href="https://t.me/+HD91s6-i7uAwZDIy" target="_blank" title="Телеграм-чат сообщества">
						Чат сообщества в Telegram
					</Link>
				),
			},
			{ type: 'divider' },
			{
				style: { display: isOpenedInTelegram ? 'none' : 'block' },
				label: 'Выйти',
				key: 'logout',
				danger: true,
				onClick: () => signOut({ redirect: true, callbackUrl: '/' }),
			},
		]

		return screens.lg ? menu : [...inlineMenuItems, { type: 'divider' }, ...menu]
	}, [isOpenedInTelegram, screens, session])

	const menuItems: MenuProps['items'] = [
		{
			key: `/my/projects/${projectSlug}`,
			label: (
				<Link href={`/my/projects/${projectSlug}`}>
					<T keyName="app.user-project.menu.overview">Overview</T>
				</Link>
			),
		},
		{
			key: `/my/projects/${projectSlug}/workflow`,
			label: (
				<Link href={`/my/projects/${projectSlug}/workflow`}>
					<T keyName="app.user-project.menu.workflow">Workflow</T>
				</Link>
			),
		},
		{
			key: `/my/projects/${projectSlug}/vacancies`,
			label: (
				<Link href={`/my/projects/${projectSlug}/vacancies`}>
					<T keyName="app.user-project.menu.vacancies">Vacancies</T>
				</Link>
			),
		},
		{
			key: `/my/projects/${projectSlug}/team`,
			label: (
				<Link href={`/my/projects/${projectSlug}/team`}>
					<T keyName="app.user-project.menu.team">Team</T>
				</Link>
			),
		},
		{
			key: `/my/projects/${projectSlug}/settings`,
			label: (
				<Link href={`/my/projects/${projectSlug}/settings`}>
					<T keyName="app.user.menu.settings">Settings</T>
				</Link>
			),
		},
	]

	if (isFetched && !project) {
		return (
			<ProtectedLayout>
				<NextSeo title="Error 404" nofollow noindex />
				<Error404 callbackUrl={'/hub'} textBackButton="Back to Hub" theme="light" containerStyle={{ height: '50vh' }} />
			</ProtectedLayout>
		)
	}

	return (
		<ProjectContext.Provider value={{ contextProject, setContextProject }}>
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
									<GdhubLogo style={{ width: '100px' }} />
								</Link>
								<RxSlash size={24} color="#ededed" style={{ display: 'block' }} />
								<Button type="text" size="small">
									<Link href={`/hub`}>
										<T>My Projects</T>
									</Link>
								</Button>
								<RxSlash size={24} color="#ededed" style={{ display: 'block' }} />
								<Text>{project?.name || 'Project'}</Text>
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
						<Menu items={menuItems} mode="horizontal" selectedKeys={[router.asPath]} className={styles.appMenu} />
					</Header>
					<Content className={styles.contentContainer}>
						<div className={styles.content}>
							{!!title && <Title>{title}</Title>}
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
		</ProjectContext.Provider>
	)
}
