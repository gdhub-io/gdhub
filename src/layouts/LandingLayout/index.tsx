import { useEffect, useMemo, useState } from 'react'
import GdhubLogo from '@/assets/images/gdhub-logo.svg'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { Avatar, Button, Drawer, Grid, Layout, Menu, MenuProps, Row, Space } from 'antd'
import Image from 'next/image'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { AiOutlineMenu, AiOutlineClose } from 'react-icons/ai'
import styles from './style.module.scss'

const { Header, Footer, Content } = Layout

export const LandingLayout = ({ children }: any) => {
	const [openMobileMenu, setOpenMobileMenu] = useState(false)
	const [scrollY, setScrollY] = useState(0)
	const screens = Grid.useBreakpoint()
	const { data: session }: any = useSession()

	useEffect(() => {
		if (!screens.lg) setOpenMobileMenu(false)
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
						{screens.lg ? <Button type="text">About us</Button> : 'About us'}
					</Link>
				),
				key: '#about',
			},
			{
				label: (
					<Link href="#for-authors" title="For Authors">
						{screens.lg ? <Button type="text">For Authors</Button> : 'For Authors'}
					</Link>
				),
				key: '#for-authors',
			},
			{
				label: (
					<Link href="#for-specialists" title="For Specialists">
						{screens.lg ? <Button type="text">For Specialists</Button> : 'For Specialists'}
					</Link>
				),
				key: '#for-specialists',
			},
			{
				label: (
					<Link href="#contacts" title="Contacts">
						{screens.lg ? <Button type="text">Contacts</Button> : 'Contacts'}
					</Link>
				),
				key: '#contacts',
			},
		],
		[screens, session]
	)

	return (
		<>
			<Layout className={styles.container}>
				<Header className={scrollY > 0 ? styles.fixedHeader : styles.header}>
					<Row align="middle" justify="space-between" className={styles.headerContainer}>
						<Link href="/" className="logo">
							<GdhubLogo style={{ width: '120px', height: '29px' }} />
						</Link>

						{screens.lg ? (
							<>
								{screens.lg && (
									<Menu style={{ flex: 1, justifyContent: 'center' }} mode="horizontal" items={headerMenu} />
								)}
								{!!session && (
									<Button type="link" size="large">
										Go to app
									</Button>
								)}
							</>
						) : (
							<div className={styles.mobileMenuBtn}>
								<Button type="text" onClick={() => setOpenMobileMenu(true)}>
									<AiOutlineMenu size={32} />
								</Button>
							</div>
						)}

						{!session && screens.xl && (
							<Link href="/signin">
								<Button>Log in</Button>
							</Link>
						)}
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
					extra={
						<Button size="small" onClick={() => setOpenMobileMenu(false)} type="text">
							<AiOutlineClose size={24} />
						</Button>
					}
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
		</>
	)
}
