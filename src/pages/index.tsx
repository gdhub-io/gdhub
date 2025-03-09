import { useEffect, useState } from 'react'
import { LandingContactsSection } from '@/components/landing/LandingContactsSection'
import { LandingFeedbackSection } from '@/components/landing/LandingFeedbackSection'
import { LandingForAuthorsSection } from '@/components/landing/LandingForAuthorsSection'
import { LandingForSpecialistsSection } from '@/components/landing/LandingForSpecialistsSection'
import { LandingHeroSection } from '@/components/landing/LandingHeroSection'
import { LandingRecentDevlogsSection } from '@/components/landing/LandingRecentDevlogsSection'
import { LandingWhoWeAreSection } from '@/components/landing/LandingWhoWeAreSection'
import { useTelegram } from '@/helpers/useTelegram'
import { LandingLayout } from '@/layouts/LandingLayout'
import { prisma } from '@/services/prisma'
import { Typography } from 'antd'
import { useRouter } from 'next/router'
import { signIn } from 'next-auth/react'
import { NextPageWithLayout } from './_app'
import styles from './home.module.scss'

const { Title } = Typography

declare global {
	interface Window {
		$crisp?: any
	}
}

interface LandingPageParams {
	isHealthy: boolean
	stats: { usersCount: number; specialitiesCount: number; projectsCount: number; vacanciesCount: number }
}

const LandingPage: NextPageWithLayout<LandingPageParams> = ({ stats }) => {
	const router = useRouter()
	const [isOpenedInTelegram, telegramUser, telegramApp] = useTelegram()
	const [signInProcessing, setSignInProcessing] = useState(false)

	useEffect(() => {
		if (isOpenedInTelegram) {
			handleSignInTelegram()
		}
	}, [isOpenedInTelegram])

	const handleSignInTelegram = async () => {
		if (!isOpenedInTelegram) return

		try {
			setSignInProcessing(true)
			const res = await signIn('telegram-web-app', { redirect: false }, { username: telegramUser.username })

			if (!res?.ok) {
				if (res?.status == 401) {
					setSignInProcessing(false)
					return
				} else {
					throw new Error(`Error ${res?.status}. ${res?.error}`)
				}
			}

			router.push('/hub')
		} catch (error: any) {
			telegramApp.showAlert(error.message)
			setSignInProcessing(false)
		}
	}

	return (
		<>
			{/* <Head>
				<title>Game Developers Hub</title>
			</Head> */}
			<LandingLayout className={styles.container}>
				<div className={styles.main}>
					<LandingHeroSection stats={stats} />
					<LandingWhoWeAreSection />
					<LandingForAuthorsSection />
					<LandingForSpecialistsSection />
					<LandingRecentDevlogsSection />
					<LandingFeedbackSection />
					<LandingContactsSection />
				</div>
			</LandingLayout>
		</>
	)
}

export async function getStaticProps() {
	const isHealthy = await prisma.$isHealthy()

	if (!isHealthy) {
		return { props: { isHealthy: false } }
	}

	const usersCount = await prisma.user.count()
	const specialitiesCount = await prisma.speciality.count()

	const projectsCount = await prisma.project.count({ where: { status: 'Approved' } })
	const vacanciesCount = await prisma.teamVacancy.count({ where: { status: 'Published' } })

	return {
		props: {
			stats: {
				usersCount,
				specialitiesCount,
				projectsCount,
				vacanciesCount,
			},
		},
		revalidate: 360,
	}
}

export default LandingPage
