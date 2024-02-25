import { useCallback, useEffect, useMemo, useState } from 'react'
import PublicHeaderBg from '@/assets/images/public-header-bg.png'
import { MainFooter } from '@/components/MainFooter'
import { MainHeader } from '@/components/MainHeader'
import { publicThemeConfig } from '@/config/theme'
import { hasRole } from '@/helpers/user'
import { useTelegram } from '@/helpers/useTelegram'
import { UserRole } from '@prisma/client'
import { T, useTolgee } from '@tolgee/react'
import { Avatar, Button, ConfigProvider, Drawer, Grid, Layout, Menu, MenuProps, Space, Tooltip, Typography } from 'antd'
import enLocale from 'antd/locale/en_US'
import ruLocale from 'antd/locale/ru_RU'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { signOut, useSession } from 'next-auth/react'
import { NextSeo } from 'next-seo'
import { AiOutlineClose } from 'react-icons/ai'
import { TbBrandTelegram } from 'react-icons/tb'
import styles from './style.module.scss'

const { Header, Footer, Content } = Layout
const { Text, Title } = Typography

export const PublicLayout = ({ children, title, seo, subTitle, backgroundImage }: any) => {
	const router = useRouter()
	const { t } = useTolgee()
	const [openMobileMenu, setOpenMobileMenu] = useState(false)
	const [isOpenedInTelegram] = useTelegram()
	const screens = Grid.useBreakpoint()
	const { data: session }: any = useSession()

	const seoSettings = {
		title,
		canonical: router.asPath,
		...seo,
	}

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

	const headerMenu: MenuProps['items'] = useMemo(
		() => [
			{
				label: (
					<Link href="#about" title={t('About us')}>
						<T>About us</T>
					</Link>
				),
				key: '#about',
			},
			{
				label: (
					<Link href="#for-authors" title={t('For Authors')}>
						<T>For Authors</T>
					</Link>
				),
				key: '#for-authors',
			},
			{
				label: (
					<Link href="#for-specialists" title={t('For Specialists')}>
						<T>For Specialists</T>
					</Link>
				),
				key: '#for-specialists',
			},
			{
				label: (
					<Link href="#contacts" title={t('Contacts')}>
						<T>Contacts</T>
					</Link>
				),
				key: '#contacts',
			},
		],
		[screens, session]
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

	const setBackground = useCallback(() => {
		if (title && !backgroundImage) return `url(${PublicHeaderBg.src})`
		if (title && backgroundImage)
			return `linear-gradient(to right, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.85) 40%, rgba(117, 19, 93, 0.3)), url(${backgroundImage})`
	}, [title, backgroundImage])

	return (
		<>
			<NextSeo {...seoSettings} />
			<ConfigProvider theme={publicThemeConfig} locale={router.locale == 'en' ? enLocale : ruLocale}>
				<style jsx global>{`
					:root {
						--background-color: #fff;
					}
				`}</style>
				<Layout className={styles.container}>
					<Header
						className={styles.header}
						style={{
							backgroundImage: setBackground(),
						}}
					>
						<MainHeader />
						<div className={styles.titleContainer}>
							{!!title && <Title className={styles.title}>{title}</Title>}
							{!!subTitle && <Text type="secondary">{subTitle}</Text>}
						</div>
					</Header>
					<Content>
						<div className="layout-background">{children}</div>
					</Content>
					<Footer className={styles.footer}>
						<MainFooter />
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
		</>
	)
}
