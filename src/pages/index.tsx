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
	stats: {
		usersCount: number | null
		specialitiesCount: number | null
		projectsCount: number | null
		vacanciesCount: number | null
	}
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

	const stats: LandingPageParams['stats'] = {
		usersCount: null,
		specialitiesCount: null,
		projectsCount: null,
		vacanciesCount: null,
	}

	try {
		stats.usersCount = await prisma.user.count()
		stats.specialitiesCount = await prisma.speciality.count()
		stats.projectsCount = await prisma.project.count({ where: { status: 'Approved' } })
		stats.vacanciesCount = await prisma.teamVacancy.count({ where: { status: 'Published' } })
	} catch (error) {
		console.error(error)
	}

	return {
		props: {
			stats,
		},
		revalidate: 360,
	}
}

export default LandingPage
