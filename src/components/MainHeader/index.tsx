import { useEffect, useMemo, useState } from 'react'
import React from 'react'
import GdhubLogo from '@/assets/images/gdhub-beta-logo.svg'
import { LogoutOutlined } from '@ant-design/icons'
import { AiOutlineClose } from '@react-icons/all-files/ai/AiOutlineClose'
import { AiOutlineMenu } from '@react-icons/all-files/ai/AiOutlineMenu'
import { T, useTolgee } from '@tolgee/react'
import { Button, Drawer, Flex, Grid, Menu, MenuProps, Skeleton, Space } from 'antd'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { signOut, useSession } from 'next-auth/react'
import styles from './style.module.scss'
import { SwitchLanguage } from '../SwitchLanguage'

export const MainHeader = ({ className }: { className?: string }) => {
	const { data: session, status: authStatus }: any = useSession()
	const screens = Grid.useBreakpoint()
	const router = useRouter()
	const { t } = useTolgee()
	const [openMobileMenu, setOpenMobileMenu] = useState(false)
	const [activeMenuKey, setActiveMenuKey] = useState<string>('')

	// hide mobile menu on resize window
	useEffect(() => {
		if (!screens.xl) setOpenMobileMenu(false)
	}, [session, screens])

	// Set active menu item when page loads and when hash changes
	useEffect(() => {
		if (document.location.hash) {
			setActiveMenuKey(document.location.hash)
		}
	}, [router.asPath])

	// hide main scroll on open menu
	useEffect(() => {
		const body = document?.querySelector('body')

		if (openMobileMenu) {
			body?.style.setProperty('overflow', 'hidden')
		}
	}, [openMobileMenu])

	const writeInternalLink = (internalLink: string) => {
		return router.pathname == '/' ? internalLink : `/${internalLink}`
	}

	// Function for smooth scrolling to anchor
	const scrollToAnchor = (e: React.MouseEvent<HTMLAnchorElement>, selector: string) => {
		if (!selector.startsWith('#')) return

		const isHomePage = router.pathname === '/'

		// On non-home pages, navigate programmatically to "/#anchor" to avoid Menu swallowing link clicks
		if (!isHomePage) {
			e.preventDefault()
			router.push(`/${selector}`)
			if (openMobileMenu) setOpenMobileMenu(false)
			return
		}

		const offset = 100 // top offset
		const element = document.querySelector(selector)
		if (!element) return

		// Smooth scroll on the same page
		e.preventDefault()
		window.scrollTo({
			behavior: 'smooth',
			top: element.getBoundingClientRect().top + window.scrollY - offset,
		})

		setActiveMenuKey(selector)
		if (openMobileMenu) {
			setOpenMobileMenu(false)
		}
	}

	// show main scroll on open menu
	const handleOpenMobileMenu = (open: boolean) => {
		const body = document?.querySelector('body')

		if (!open) {
			body?.style.setProperty('overflow', 'inherit')
		}
	}

	const headerMenu: MenuProps['items'] = useMemo(
		() => [
			{
				label: (
					<Link
						href={writeInternalLink('#about')}
						title={t('public-menu.about-us', 'About us')}
						onClick={(e) => scrollToAnchor(e, '#about')}
					>
						{t('public-menu.about-us', 'About us')}
					</Link>
				),
				key: '#about',
			},
			{
				label: (
					<Link
						href={writeInternalLink('#for-authors')}
						title={t('public-menu.for-authors', 'For Authors')}
						onClick={(e) => scrollToAnchor(e, '#for-authors')}
					>
						{t('public-menu.for-authors', 'For Authors')}
					</Link>
				),
				key: '#for-authors',
			},
			{
				label: (
					<Link
						href={writeInternalLink('#for-specialists')}
						title={t('public-menu.for-specialists', 'For Specialists')}
						onClick={(e) => scrollToAnchor(e, '#for-specialists')}
					>
						{t('public-menu.for-specialists', 'For Specialists')}
					</Link>
				),
				key: '#for-specialists',
			},
			{
				label: (
					<Link href="/projects" title={t('Video Games')}>
						{t('public-menu.video-games', 'Video Games')}
					</Link>
				),
				key: '/projects',
			},
			{
				label: (
					<Link href="/events" title={t('public-menu.events', 'Events')}>
						{t('public-menu.events', 'Events')}
					</Link>
				),
				key: '/events',
			},
			{
				label: (
					<Link
						href={writeInternalLink('#contacts')}
						title={t('public-menu.contacts', 'Contacts')}
						onClick={(e) => scrollToAnchor(e, '#contacts')}
					>
						{t('public-menu.contacts', 'Contacts')}
					</Link>
				),
				key: '#contacts',
			},
		],
		[screens, session]
	)

	const actionButton = useMemo(() => {
		if (authStatus === 'loading') {
			return (
				<div className={styles.actionButtonSkeleton}>
					<Skeleton.Button active size="large" block />
				</div>
			)
		}

		if (authStatus === 'unauthenticated') {
			return (
				<Link href="/signin">
					<Button type="primary" className={styles.actionButton} block>
						<T>Log in</T>
					</Button>
				</Link>
			)
		}

		if (authStatus === 'authenticated') {
			return (
				<Link href="/hub">
					<Button className={styles.actionButton} block>
						<T>Go to app</T>
					</Button>
				</Link>
			)
		}
	}, [authStatus])

	const logoutButton = useMemo(() => {
		if (authStatus === 'authenticated') {
			return (
				<Button type="text" size="small" onClick={() => signOut()}>
					<LogoutOutlined /> Logout
				</Button>
			)
		}
	}, [authStatus])

	return (
		<div className={[styles.container, className].join(' ')}>
			<Flex align="center" justify="space-between" className={styles.topLine}>
				{/* logo */}
				<Link href="/" className={styles.logo}>
					<GdhubLogo />
				</Link>
				{/* menu */}
				{screens.lg && (
					<div className={styles.menuContainer}>
						<Menu
							theme="dark"
							mode="horizontal"
							items={headerMenu}
							className={styles.menu}
							selectedKeys={[activeMenuKey]}
						/>
					</div>
				)}
				{/* right signin button */}
				{screens.lg && (
					<Space align="center" className={styles.rightControls}>
						{actionButton}
						<SwitchLanguage />
					</Space>
				)}
				{!screens.lg && (
					<Button type="text" className={styles.mobileMenuBtn} onClick={() => setOpenMobileMenu(true)}>
						<AiOutlineMenu size={24} />
					</Button>
				)}
			</Flex>

			{!screens.xl && (
				<Drawer
					className={styles.mobileMenuDrawer}
					height={'100%'}
					afterOpenChange={handleOpenMobileMenu}
					closeIcon={<AiOutlineClose size={24} />}
					title={
						<Flex justify="end" align="center" gap={16}>
							{logoutButton}
							<SwitchLanguage border={true} size="small" />
						</Flex>
					}
					placement="right"
					onClose={() => setOpenMobileMenu(false)}
					open={openMobileMenu}
				>
					<Space direction="vertical" size={32} style={{ width: '100%' }}>
						<Menu
							items={headerMenu}
							theme="dark"
							onSelect={({ key }) => {
								setOpenMobileMenu(false)
								setActiveMenuKey(key)
							}}
							selectedKeys={[activeMenuKey]}
						/>

						{actionButton}
					</Space>
				</Drawer>
			)}
		</div>
	)
}
