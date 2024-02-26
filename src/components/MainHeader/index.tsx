import { useEffect, useMemo, useState } from 'react'
import GdhubLogo from '@/assets/images/gdhub-beta-logo.svg'
import { T, useTolgee } from '@tolgee/react'
import { Button, Drawer, Flex, Grid, Menu, MenuProps, Space } from 'antd'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { AiOutlineClose, AiOutlineMenu } from 'react-icons/ai'
import styles from './style.module.scss'
import { SwitchLanguage } from '../SwitchLanguage'

export const MainHeader = ({ className }: { className?: string }) => {
	const { data: session }: any = useSession()
	const screens = Grid.useBreakpoint()
	const router = useRouter()
	const { t } = useTolgee()
	const [openMobileMenu, setOpenMobileMenu] = useState(false)

	// hide mobile menu on resize window
	useEffect(() => {
		if (!screens.xl) setOpenMobileMenu(false)
	}, [session, screens])

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
					<Link href={writeInternalLink('#about')} title={t('About us')}>
						<T>About us</T>
					</Link>
				),
				key: '#about',
			},
			{
				label: (
					<Link href={writeInternalLink('#for-authors')} title={t('For Authors')}>
						<T>For Authors</T>
					</Link>
				),
				key: '#for-authors',
			},
			{
				label: (
					<Link href={writeInternalLink('#for-specialists')} title={t('For Specialists')}>
						<T>For Specialists</T>
					</Link>
				),
				key: '#for-specialists',
			},
			{
				label: (
					<Link href={writeInternalLink('#contacts')} title={t('Contacts')}>
						<T>Contacts</T>
					</Link>
				),
				key: '#contacts',
			},
		],
		[screens, session]
	)

	return (
		<div className={[styles.container, className].join(' ')}>
			<Flex align="center" justify="space-between" className={styles.topLine}>
				{/* logo */}
				<Link href="/" className={styles.logo}>
					<GdhubLogo />
				</Link>
				{/* menu */}
				<div style={{ width: '100%' }}>
					{screens.lg && <Menu theme="dark" mode="horizontal" items={headerMenu} className={styles.menu} />}
				</div>
				{/* right signin button */}
				{screens.lg && (
					<Space align="center">
						<>
							{!!session ? (
								<Link href="/hub">
									<Button>
										<T>Go to app</T>
									</Button>
								</Link>
							) : (
								<Link href="/signin">
									<Button>
										<T>Log in</T>
									</Button>
								</Link>
							)}
						</>
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
					title={<Flex justify="end">{<SwitchLanguage border={true} size="small" />}</Flex>}
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
		</div>
	)
}
