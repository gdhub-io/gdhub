import { useMemo } from 'react'
import { IndieList } from '@/components/IndieList'
import MyProjectList from '@/components/MyProjectList'
import { hasRole } from '@/helpers/user'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { T, useTolgee } from '@tolgee/react'
import { Alert, Button, Space, Typography } from 'antd'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import styles from './style.module.scss'

const { Title, Text } = Typography

const HubPage: NextPageWithLayout = () => {
	const session = useSession()
	const router = useRouter()
	const { getLanguage } = useTolgee()

	const linkToChat = useMemo(() => {
		let link = ''

		switch (getLanguage()) {
			case 'en':
				link = 'https://t.me/gdhub_en'
				break
			case 'ru':
				link = 'https://t.me/gdhub_io'
				break
		}

		return link
	}, [router])

	return (
		<ProtectedLayout>
			<Space className={styles.container} direction="vertical" size={32}>
				<Space direction="vertical" size={0}>
					<Title level={2}>
						<T
							keyName="user.welcome"
							defaultValue="Hello, {userName}"
							params={{ userName: session?.data?.user.name || 'user' }}
						/>
					</Title>
					<Text>
						<T>I think now is the perfect time to make games.</T>
					</Text>
				</Space>

				{session.status == 'authenticated' && !session.data.user.onboardingDone && (
					<Alert
						type="warning"
						message={
							<Space direction="vertical">
								<div>
									<T keyName="hub.text1.part1">
										Now you can get acquainted with our platform, but in order to be able to create your own projects or
										respond to the vacancies of others, you need to complete the registration by filling in the
										necessary information about yourself.
									</T>
									<br />
									<T keyName="hub.text1.part2">And don&apos;t forget to join the community chat using</T>{' '}
									<Link href={linkToChat} target="_blank">
										this link.
									</Link>
								</div>
								<Link href="/registration/onboarding">
									<Button>
										<T>Complete Registration</T>
									</Button>
								</Link>
							</Space>
						}
					/>
				)}
				{session.status == 'authenticated' && !!session.data.user.onboardingDone && (
					<>
						<MyProjectList />
					</>
				)}
			</Space>
		</ProtectedLayout>
	)
}

export default HubPage
