'use client'

import { ConfigProvider } from 'antd'
import enLocale from 'antd/locale/en_US'
import ruLocale from 'antd/locale/ru_RU'
import dynamic from 'next/dynamic'
import { publicThemeConfig } from '@/config/theme'
import styles from '../../pages/home.module.scss'

const LandingLayout = dynamic(() => import('@/layouts/LandingLayout').then((m) => m.LandingLayout), { ssr: false })
const LandingHeroSection = dynamic(
	() => import('@/components/landing/LandingHeroSection').then((m) => m.LandingHeroSection),
	{ ssr: false }
)
const LandingWhoWeAreSection = dynamic(
	() => import('@/components/landing/LandingWhoWeAreSection').then((m) => m.LandingWhoWeAreSection),
	{ ssr: false }
)
const LandingForAuthorsSection = dynamic(
	() => import('@/components/landing/LandingForAuthorsSection').then((m) => m.LandingForAuthorsSection),
	{ ssr: false }
)
const LandingForSpecialistsSection = dynamic(
	() => import('@/components/landing/LandingForSpecialistsSection').then((m) => m.LandingForSpecialistsSection),
	{ ssr: false }
)
const LandingRecentDevlogsSection = dynamic(
	() => import('@/components/landing/LandingRecentDevlogsSection').then((m) => m.LandingRecentDevlogsSection),
	{ ssr: false }
)
const LandingFeedbackSection = dynamic(
	() => import('@/components/landing/LandingFeedbackSection').then((m) => m.LandingFeedbackSection),
	{ ssr: false }
)
const LandingContactsSection = dynamic(
	() => import('@/components/landing/LandingContactsSection').then((m) => m.LandingContactsSection),
	{ ssr: false }
)

export function HomeClient({ stats, locale }: { stats: any; locale: 'en' | 'ru' }) {
	return (
		<ConfigProvider theme={publicThemeConfig} locale={locale === 'en' ? enLocale : ruLocale}>
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
		</ConfigProvider>
	)
}
