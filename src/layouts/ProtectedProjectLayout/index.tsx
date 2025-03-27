import { ReactNode, useEffect, useMemo, useState } from 'react'
import GdhubLogo from '@/assets/images/gdhub-logo-v2b.svg'
import { Error404 } from '@/components/Error404'
import { NotificationsBell } from '@/components/NotificationsBell'
import { appThemeConfig } from '@/config/theme'
import { ContextProject, ProjectContext } from '@/contexts/ProjectContext'
import { hasRole } from '@/helpers/user'
import { useTelegram } from '@/helpers/useTelegram'
import { useCurrentProject } from '@/hooks/project'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { AiOutlineClose } from '@react-icons/all-files/ai/AiOutlineClose'
import { AiOutlineMenu } from '@react-icons/all-files/ai/AiOutlineMenu'
import { GoArrowUp } from '@react-icons/all-files/go/GoArrowUp'
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
	FloatButton,
	Grid,
	Layout,
	Menu,
	MenuProps,
	Row,
	Space,
	Typography,
} from 'antd'
import { ItemType } from 'antd/es/menu/interface'
import enLocale from 'antd/locale/en_US'
import ruLocale from 'antd/locale/ru_RU'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { signOut, useSession } from 'next-auth/react'
import { NextSeo, NextSeoProps } from 'next-seo'
import ReactNiceAvatar, { genConfig } from 'react-nice-avatar'
import styles from './style.module.scss'
import { ProtectedLayout } from '../ProtectedLayout'

const { Header, Content } = Layout
const { Title, Text } = Typography

export const ProtectedProjectLayout = ({
	title,
	seo,
	children,
}: {
	title?: string
	seo?: NextSeoProps
	children: ReactNode
}) => {
	const { t } = useTolgee()
	const router = useRouter()
	const projectSlug = router.query.slug as string
	const [contextProject, setContextProject] = useState<ContextProject>()
	const [openMobileMenu, setOpenMobileMenu] = useState(false)
	const [isOpenedInTelegram] = useTelegram()
	const screens = Grid.useBreakpoint()
	const { data: session }: any = useSession()
	const { changeLanguage, getLanguage } = useTolgee()

	const { project, isFetched } = useCurrentProject()
	const isProjectAuthor = useMemo(() => project?.authorId === session?.user.id, [project, session])

	useEffect(() => {
		if (!project) return

		setContextProject({ id: project.id, name: project.name, teamId: project.teamId, isProjectAuthor })
	}, [project, isProjectAuthor])

	const seoSettings: NextSeoProps = {
		title: title || 'Project',
		canonical: process.env.NEXT_PUBLIC_APP_URI + router.asPath,
		nofollow: true,
		noindex: true,
		...seo,
	}

	useEffect(() => {
		if (session?.user.lang) changeLanguage(session.user.lang).then((d) => console.log('langiage is changed'))
	}, [session?.user.lang])

	useEffect(() => {
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
					<Link href="/hub" title="Dashboard">
						{screens.lg ? (
							<Button type="primary" size="small">
								Dashboard
							</Button>
						) : (
							t('Dashboard')
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

		if (hasRole(prismaClient.UserRole.Admin, { data: session })) {
			menu.push({
				label: <Link href="/admin/seasons">Админка</Link>,
				key: '/admin/seasons',
			})
		}

		menu = [
			...menu,
			{
				label: <Link href="/profile">User Settings</Link>,
				key: 'profile',
			},
			{ type: 'divider' },
			{
				key: 'tg-community',
				label: (
					<Link href="https://t.me/gdhub_io" target="_blank" title="Telegram community chat">
						<Flex justify="space-between" align="center" gap={16}>
							<Text>Community chat</Text>
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
				label: 'Logout',
				key: 'logout',
				danger: true,
				onClick: () => signOut({ redirect: true, callbackUrl: '/' }),
			},
		]

		return screens.lg ? menu : [...inlineMenuItems, { type: 'divider' }, ...menu]
	}, [isOpenedInTelegram, screens, session])

	const menuItems: (ItemType & { disabled: boolean })[] = [
		{
			key: `/my/projects/${projectSlug}`,
			disabled: false,
			label: <Link href={`/my/projects/${projectSlug}`}>{t('app.user-project.menu.overview', 'Devlog')}</Link>,
		},
		{
			key: `/my/projects/${projectSlug}/workflow`,
			disabled: false,
			label: (
				<Link href={`/my/projects/${projectSlug}/workflow`}>{t('app.user-project.menu.workflow', 'Workflow')}</Link>
			),
		},
		{
			key: `/my/projects/${projectSlug}/vacancies`,
			disabled: !isProjectAuthor,
			label: (
				<Link href={`/my/projects/${projectSlug}/vacancies`}>{t('app.user-project.menu.vacancies', 'Vacancies')}</Link>
			),
		},
		{
			key: `/my/projects/${projectSlug}/team`,
			disabled: false,
			label: <Link href={`/my/projects/${projectSlug}/team`}>{t('app.user-project.menu.team', 'Team')}</Link>,
		},
		{
			key: `/my/projects/${projectSlug}/settings`,
			disabled: !isProjectAuthor,
			label: <Link href={`/my/projects/${projectSlug}/settings`}>{t('app.user.menu.settings', 'Settings')}</Link>,
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
		<ProjectContext.Provider value={{ contextProject, isLoaded: isFetched, setContextProject }}>
			<NextSeo {...seoSettings} />
			<ConfigProvider theme={appThemeConfig} locale={getLanguage() == 'en' ? enLocale : ruLocale}>
				<style jsx global>{`
					:root {
						--background-color: #fafafa;
					}
				`}</style>
				<Layout className={styles.container}>
					<Header className={styles.header}>
						{/* <Flex align="middle" justify="space-between"> */}
						<Row wrap={false} align="middle">
							<Col flex="auto">
								<Flex align="center" justify="start" gap={8}>
									<Link href="/hub" className="logo">
										<GdhubLogo style={{ width: '100px' }} />
									</Link>
									<RxSlash size={24} color="#ededed" style={{ display: 'block' }} />
									{screens.lg && (
										<>
											<Button type="text" size="small">
												<Link href={`/hub`}>
													<T>Hub</T>
												</Link>
											</Button>
											<RxSlash size={24} color="#ededed" style={{ display: 'block' }} />
										</>
									)}
									<Text style={{ verticalAlign: 'middle' }} ellipsis={{ tooltip: true }}>
										{project?.name || 'Project'}
									</Text>
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
													style={{ display: 'block', padding: 0, lineHeight: 0, borderRadius: '50%' }}
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
							</Col>
						</Row>
						{/* </Flex> */}
						{/* <Tabs defaultActiveKey="1" items={menuItems} onChange={() => {}} /> */}
						<Menu
							items={menuItems.filter((r) => !r.disabled)}
							mode="horizontal"
							selectedKeys={[router.asPath]}
							className={styles.appMenu}
						/>
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
