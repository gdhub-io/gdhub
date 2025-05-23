import React from 'react'
import { EventCard, PastEventCard, EventSection, BannerEventSlider } from '@/components/events'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { useQuery } from '@tanstack/react-query'
import { useTolgee } from '@tolgee/react'
import { Button, theme } from 'antd'
import axios from 'axios'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import styles from './style.module.scss'

const EventsPage: NextPageWithLayout = () => {
	const { t } = useTolgee()
	const router = useRouter()
	const { token } = theme.useToken()
	const { data: session } = useSession()

	const { data: userEventCount } = useQuery(
		['user-event-count', session?.user?.id],
		() => axios.get('/api/user/event/count').then((res) => res.data),
		{ enabled: !!session?.user?.id }
	)

	return (
		<ProtectedLayout
			title={t('page.events.title', 'Events')}
			seo={{ openGraph: { type: 'website', url: router.asPath } }}
			extra={
				!!userEventCount && (
					<Link href="/hub/events/my">
						<Button type="text">{t('page.events.myEvents', 'My Events')}</Button>
					</Link>
				)
			}
		>
			<div className={styles.container}>
				<BannerEventSlider />

				<EventSection
					title={t('page.events.newKnowledge', 'New Knowledge')}
					description={t(
						'page.events.newKnowledgeDescription',
						'Meetups and workshops for sharing experience, learning, and networking.'
					)}
					eventTypes={['MEETUP', 'WORKSHOP']}
					eventStatus="upcoming"
					CardComponent={EventCard}
					token={token}
				/>
				<EventSection
					title={t('page.events.gameJamsAndExperiments', 'Experience & Experiments')}
					description={t(
						'page.events.gameJamsAndExperimentsDescription',
						'Game jams for practice, experiments, and new connections.'
					)}
					eventTypes={['GAMEJAM', 'GAMELAB']}
					eventStatus="upcoming"
					CardComponent={EventCard}
					token={token}
				/>
				<EventSection
					title={t('page.events.pastEvents', 'Some Past Events')}
					description={t('page.events.pastEventsDescription', "Here are some of the platform's completed events.")}
					eventTypes={['MEETUP', 'WORKSHOP', 'GAMEJAM', 'GAMELAB', 'CONFERENCE']}
					eventStatus="past"
					CardComponent={PastEventCard}
					token={token}
					colSpan={{ xs: 24, sm: 12, md: 8, lg: 6, xl: 4 }}
				/>
			</div>
		</ProtectedLayout>
	)
}

export default EventsPage
