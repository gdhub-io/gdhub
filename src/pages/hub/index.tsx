import { useEffect, useMemo, useState } from 'react'
import { IndieList } from '@/components/IndieList'
import CreateProjectModal from '@/components/modals/CreateProjectModal'
import { hasRole } from '@/helpers/user'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { UserRole } from '@prisma/client'
import { T } from '@tolgee/react'
import { Button, Flex, Space } from 'antd'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import styles from './style.module.scss'

const HubPage: NextPageWithLayout = () => {
	const session = useSession()
	const router = useRouter()
	const [openCreateProjectModal, setOpenCreateProjectModal] = useState(false)

	useEffect(() => {
		console.log('session', session, hasRole(UserRole.Member, session))
	}, [session])

	const linkToChat = useMemo(() => {
		let link = ''

		switch (router.locale) {
			case 'en':
				link = 'https://discord.gg/WcUFD3tHqg'
				break
			case 'ru':
				link = 'https://t.me/+HD91s6-i7uAwZDIy'
				break
		}

		return link
	}, [router])

	return (
		<ProtectedLayout>
			<Head>
				<title>Game Developers Hub</title>
			</Head>
			<div className={styles.container}>
				<Flex justify="end">
					<Button type="primary" onClick={() => setOpenCreateProjectModal(true)}>
						<Space>Add Project</Space>
					</Button>
				</Flex>
				{session.status == 'authenticated' && !hasRole(UserRole.Member, session) && (
					<Space direction="vertical">
						<p>
							<T keyName="hub.text1.part1">
								In order to become participants in the Hub, you need to fill out information about yourself, indicate
								your specialties, preferences in games, and also indicate the time that you are willing to use to
								participate in projects. To do this, go to your Profile and provide the required data.
							</T>
							<br />
							<T keyName="hub.text1.part2">And don&apos;t forget to join the community chat using</T>{' '}
							<Link href={linkToChat} target="_blank">
								this link
							</Link>
						</p>
						<Link href="/profile">
							<Button>
								<T>My Profile</T>
							</Button>
						</Link>
					</Space>
				)}
				{session.status == 'authenticated' && hasRole(UserRole.Member, session) && (
					<>
						{/* <SeasonsList /> */}
						<IndieList />
					</>
				)}
			</div>

			<CreateProjectModal open={openCreateProjectModal} onCancel={() => setOpenCreateProjectModal(false)} />
		</ProtectedLayout>
	)
}

export default HubPage
