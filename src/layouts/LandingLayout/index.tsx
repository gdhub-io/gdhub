import { useEffect, useMemo, useState } from 'react'
import GdhubLogo from '@/assets/images/gdhub-logo.svg'
import { Avatar, Button, Col, Drawer, Grid, Layout, Menu, MenuProps, Row, Space, Typography } from 'antd'
import Image from 'next/image'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { AiOutlineMenu, AiOutlineClose } from 'react-icons/ai'
import { BsDiscord, BsMailbox, BsTelegram } from 'react-icons/bs'
import styles from './style.module.scss'

const { Header, Footer, Content } = Layout
const { Paragraph, Text, Title } = Typography

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
			<Header className={scrollY > 0 ? styles.fixedHeader : styles.header}>
				<Row align="middle" justify="space-between" className={styles.headerContainer}>
					<Link href="/" className="logo">
						<GdhubLogo style={{ width: '120px', height: '31px' }} />
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
						<div style={{ flex: 1, justifyContent: 'flex-end', display: 'inline-flex' }}>
							<Button type="text" onClick={() => setOpenMobileMenu(true)}>
								<AiOutlineMenu />
							</Button>
						</div>
					)}

					{!session && (
						<Link href="/signin">
							<Button>Log in</Button>
						</Link>
					)}
				</Row>
			</Header>
			<Layout className={styles.container}>
				<Content>
					<div className="layout-background">{children}</div>
				</Content>
				<Footer className={styles.footer}>
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
							<GdhubLogo style={{ width: '120px', height: '31px' }} />
							<Paragraph>
								A community of game industry professionals whose members form teams to develop new games. Do you want to
								get a new experience or develop your own game? Join now!
							</Paragraph>
						</Col>
						<Col span={4}>
							<Space direction="vertical">
								<Title level={5}>Company</Title>
								<Text>About us</Text>
							</Space>
						</Col>
						<Col span={4}>
							<Space direction="vertical">
								<Title level={5}>For Users</Title>
								<Text>For Authors</Text>
								<Text>For Specialists</Text>
							</Space>
						</Col>
						<Col span={4}>
							<Space direction="vertical">
								<Title level={5}>Support</Title>
								<Text>Cookie Policy</Text>
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
					<Menu items={headerMenu} onSelect={() => setOpenMobileMenu(false)} />
				</Drawer>
			)}
		</>
	)
}
