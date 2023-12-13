import { useEffect, useMemo, useState } from 'react'
import GdhubLogo from '@/assets/images/gdhub-logo-v2.svg'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { landingThemeConfig } from '@/config/theme'
import { useTolgee } from '@tolgee/react'
import {
	Avatar,
	Button,
	ConfigProvider,
	Drawer,
	Grid,
	Layout,
	Menu,
	MenuProps,
	Row,
	Select,
	Space,
	Typography,
} from 'antd'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { AiOutlineMenu, AiOutlineClose } from 'react-icons/ai'
import styles from './style.module.scss'

const { Header, Footer, Content } = Layout
const { Text } = Typography

export const LandingLayout = ({ children }: any) => {
	const router = useRouter()
	const tolgee = useTolgee(['language'])
	const [openMobileMenu, setOpenMobileMenu] = useState(false)
	const [scrollY, setScrollY] = useState(0)
	const screens = Grid.useBreakpoint()
	const { data: session }: any = useSession()

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
					<Link href="#about" title="About us">
						About us
					</Link>
				),
				key: '#about',
			},
			{
				label: (
					<Link href="#for-authors" title="For Authors">
						For Authors
					</Link>
				),
				key: '#for-authors',
			},
			{
				label: (
					<Link href="#for-specialists" title="For Specialists">
						For Specialists
					</Link>
				),
				key: '#for-specialists',
			},
			{
				label: (
					<Link href="#contacts" title="Contacts">
						Contacts
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
					<Row align="middle" justify="space-between" className={styles.headerContainer}>
						<Link href="/" className="logo">
							<GdhubLogo style={{ width: '156px', height: '42px' }} />
						</Link>

						{screens.lg ? (
							<>
								<Menu
									className={styles.headerMenu}
									style={{ flex: 1, justifyContent: 'center', columnGap: screens.xl ? 64 : 32 }}
									mode="horizontal"
									items={headerMenu}
								/>

								{!!session && (
									<Link href="/hub">
										<Button>Go to app</Button>
									</Link>
								)}
							</>
						) : (
							<div className={styles.mobileMenuBtn}>
								<Button type="text" onClick={() => setOpenMobileMenu(true)}>
									<AiOutlineMenu size={32} />
								</Button>
							</div>
						)}

						{!session && screens.lg && (
							<Link href="/signin">
								<Button>Log in</Button>
							</Link>
						)}

						<Select
							style={{ marginLeft: 16 }}
							bordered={false}
							value={tolgee.getLanguage()}
							options={[
								{
									label: <Text>En</Text>,
									value: 'en',
								},
								{
									label: <Text>Ру</Text>,
									value: 'ru',
								},
							]}
							onSelect={(value) => {
								router.replace(router.pathname, undefined, { locale: value })
							}}
						/>
					</Row>
				</Header>
				<Content className={styles.content}>{children}</Content>
				<Footer className={styles.footer}>
					<LandingFooter />
				</Footer>
			</Layout>

			{!screens.lg && (
				<Drawer
					className={styles.mobileMenuDrawer}
					height={'100%'}
					afterOpenChange={handleOpenMobileMenu}
					closeIcon={<AiOutlineClose size={24} />}
					title={
						!!session && (
							<Space align="center">
								<Avatar
									src={
										session.user?.image ? <Image src={session.user.image} width={32} height={32} alt="avatar" /> : null
									}
									shape="square"
								/>
								<div className="username">{session.user?.name}</div>
							</Space>
						)
					}
					placement="right"
					onClose={() => setOpenMobileMenu(false)}
					open={openMobileMenu}
				>
					<Space direction="vertical" size={32} style={{ width: '100%' }}>
						<Menu items={headerMenu} theme="dark" onSelect={() => setOpenMobileMenu(false)} />
						<Link href="/signin">
							<Button size="small" type="primary" style={{ width: '100%' }}>
								Log in
							</Button>
						</Link>
					</Space>
				</Drawer>
			)}
		</ConfigProvider>
	)
}
