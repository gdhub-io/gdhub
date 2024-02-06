import { useEffect, useMemo, useState } from 'react'
import { MainFooter } from '@/components/MainFooter'
import { MainHeader } from '@/components/MainHeader'
import { landingThemeConfig } from '@/config/theme'
import { T, useTolgee } from '@tolgee/react'
import { Avatar, Button, ConfigProvider, Drawer, Flex, Grid, Layout, Menu, MenuProps, Space, Typography } from 'antd'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { AiOutlineClose } from 'react-icons/ai'
import styles from './style.module.scss'

const { Header, Footer, Content } = Layout
const { Text } = Typography

const scrollIntoViewWithOffset = (selector: string, offset: number) => {
	const hookEl = document?.querySelector(selector)

	if (!hookEl) return

	window.scrollTo({
		behavior: 'instant',
		top: hookEl.getBoundingClientRect().top - document.body.getBoundingClientRect().top - offset,
	})
}

export const LandingLayout = ({ children }: any) => {
	const { t } = useTolgee()
	const router = useRouter()
	const [openMobileMenu, setOpenMobileMenu] = useState(false)
	const [scrollY, setScrollY] = useState(0)
	const screens = Grid.useBreakpoint()
	const { data: session }: any = useSession()

	useEffect(() => {
		if (document.location.hash) {
			scrollIntoViewWithOffset(document.location.hash, 100)
		}
	}, [router])

	useEffect(() => {
		if (!screens.xl) setOpenMobileMenu(false)
	}, [session, screens])

	useEffect(() => {
		const handleScroll = () => {
			setScrollY(window.scrollY)
		}

		handleScroll()

		window.addEventListener('scroll', handleScroll)
		return () => {
			window.removeEventListener('scroll', handleScroll)
		}
	}, [])

	// hide main scroll on open menu
	useEffect(() => {
		const body = document?.querySelector('body')

		if (openMobileMenu) {
			body?.style.setProperty('overflow', 'hidden')
		}
	}, [openMobileMenu])

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

	return (
		<ConfigProvider theme={landingThemeConfig}>
			<Layout className={styles.container}>
				<Header className={scrollY > 0 ? styles.fixedHeader : styles.header}>
					<MainHeader />
				</Header>
				<Content className={styles.content}>{children}</Content>
				<Footer className={styles.footer}>
					<MainFooter />
				</Footer>
			</Layout>

			{!screens.xl && (
				<Drawer
					className={styles.mobileMenuDrawer}
					height={'100%'}
					afterOpenChange={handleOpenMobileMenu}
					closeIcon={<AiOutlineClose size={24} />}
					title={
						!!session && (
							<Flex align="center" justify="space-between">
								<Avatar
									src={
										session.user?.image ? <Image src={session.user.image} width={32} height={32} alt="avatar" /> : null
									}
									shape="square"
								/>
								<Text className="username" ellipsis>
									{session.user?.name}
								</Text>
								{/* <SwitchLanguage border={true} size="small" /> */}
							</Flex>
						)
					}
					placement="right"
					onClose={() => setOpenMobileMenu(false)}
					open={openMobileMenu}
				>
					<Space direction="vertical" size={32} style={{ width: '100%' }}>
						<Menu items={headerMenu} theme="dark" onSelect={() => setOpenMobileMenu(false)} />

						{!!session ? (
							<Link href="/hub">
								<Button type="primary" style={{ width: '100%' }}>
									<T>Go to app</T>
								</Button>
							</Link>
						) : (
							<Link href="/signin">
								<Button type="primary" style={{ width: '100%' }}>
									<T>Log in</T>
								</Button>
							</Link>
						)}
					</Space>
				</Drawer>
			)}
		</ConfigProvider>
	)
}
