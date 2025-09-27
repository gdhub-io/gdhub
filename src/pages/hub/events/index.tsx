import React, { Suspense } from 'react'
import { EventCard, PastEventCard, EventSection, BannerEventSlider, EmptyEventState } from '@/components/events'
import SectionSkeleton from '@/components/events/SectionSkeleton'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { useQuery } from '@tanstack/react-query'
import { useTranslate } from '@tolgee/react'
import { Button, theme } from 'antd'
import axios from 'axios'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import styles from './style.module.scss'

const EventsPage: NextPageWithLayout = () => {
	const { t } = useTranslate()
	const router = useRouter()
	const { token } = theme.useToken()
	const { data: session } = useSession()

	const { data: eventCount, isFetched: isCountFetched } = useQuery({
		queryKey: ['user-event-count', session?.user?.id],
		queryFn: () => axios.get('/api/user/event/count').then((res) => res.data),
		enabled: Boolean(session?.user?.id),
	})

	const [loadingSections, setLoadingSections] = React.useState({
		knowledge: true,
		experiments: true,
		past: true,
	})

	const handleLoadingChange = React.useCallback((key: keyof typeof loadingSections, isLoading: boolean) => {
		setLoadingSections((prev) => ({ ...prev, [key]: isLoading }))
	}, [])

	const onKnowledgeLoadingChange = React.useCallback(
		(isLoading: boolean) => handleLoadingChange('knowledge', isLoading),
		[handleLoadingChange]
	)
	const onExperimentsLoadingChange = React.useCallback(
		(isLoading: boolean) => handleLoadingChange('experiments', isLoading),
		[handleLoadingChange]
	)
	const onPastLoadingChange = React.useCallback(
		(isLoading: boolean) => handleLoadingChange('past', isLoading),
		[handleLoadingChange]
	)

	return (
		<ProtectedLayout
			title={t('page.events.title', 'Events')}
			seo={{ openGraph: { type: 'website', url: router.asPath } }}
			extra={
				!!eventCount?.userCount && (
					<Link href="/hub/events/my">
						<Button type="text">{t('page.events.myEvents', 'My Events')}</Button>
					</Link>
				)
			}
		>
			<div className={styles.container}>
				{isCountFetched && eventCount?.totalPublishedCount ? (
					<>
						<BannerEventSlider />

						{(loadingSections.knowledge || loadingSections.experiments || loadingSections.past) && (
							<SectionSkeleton
								title={t('page.events.newKnowledge', 'New Knowledge')}
								description={t(
									'page.events.newKnowledgeDescription',
									'Meetups and workshops for sharing experience, learning, and networking.'
								)}
							/>
						)}

						<Suspense>
							<EventSection
								title={t('page.events.newKnowledge', 'New Knowledge')}
								description={t(
									'page.events.newKnowledgeDescription',
									'Meetups and workshops for sharing experience, learning, and networking.'
								)}
								eventTypes={[prismaClient.$Enums.EventType.Meetup, prismaClient.$Enums.EventType.Workshop]}
								timeStatus={['ongoing', 'upcoming']}
								CardComponent={EventCard}
								token={token}
								onLoadingChange={onKnowledgeLoadingChange}
							/>
						</Suspense>
						<Suspense>
							<EventSection
								title={t('page.events.gameJamsAndExperiments', 'Experience & Experiments')}
								description={t(
									'page.events.gameJamsAndExperimentsDescription',
									'Game jams for practice, experiments, and new connections.'
								)}
								eventTypes={[prismaClient.$Enums.EventType.GameJam, prismaClient.$Enums.EventType.GameLab]}
								timeStatus={['ongoing', 'upcoming']}
								CardComponent={EventCard}
								token={token}
								onLoadingChange={onExperimentsLoadingChange}
							/>
						</Suspense>
						<Suspense>
							<EventSection
								title={t('page.events.pastEvents', 'Some Past Events')}
								description={t(
									'page.events.pastEventsDescription',
									"Here are some of the platform's completed events."
								)}
								eventTypes={[
									prismaClient.$Enums.EventType.Meetup,
									prismaClient.$Enums.EventType.Workshop,
									prismaClient.$Enums.EventType.GameJam,
									prismaClient.$Enums.EventType.GameLab,
									prismaClient.$Enums.EventType.Conference,
								]}
								timeStatus={['past']}
								CardComponent={PastEventCard}
								token={token}
								colSpan={{ xs: 24, sm: 12, md: 8, lg: 6, xl: 4 }}
								onLoadingChange={onPastLoadingChange}
							/>
						</Suspense>
					</>
				) : isCountFetched ? (
					<EmptyEventState />
				) : null}
			</div>
		</ProtectedLayout>
	)
}

export default EventsPage
