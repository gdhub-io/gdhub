import React, { useMemo } from 'react'
import { EventCard, PastEventCard, EventSection, BannerEventSlider } from '@/components/events'
import CreateEventButton from '@/components/events/CreateEventButton'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { useTolgee } from '@tolgee/react'
import { theme } from 'antd'
import { useRouter } from 'next/router'
import { mockEvents, Event, EventStatus } from './mock.data'
import styles from '../style.module.scss'

function getEventStatus(event: Event, now: Date): EventStatus {
	const start = new Date(event.startDate)
	const end = new Date(event.endDate)
	if (now < start) return 'upcoming'
	if (now > end) return 'past'
	return 'ongoing'
}

const EventsPage: NextPageWithLayout = () => {
	const { t } = useTolgee()
	const router = useRouter()
	const { token } = theme.useToken()
	const now = useMemo(() => new Date(), [])
	const eventsByStatus = useMemo(() => {
		const grouped: Record<EventStatus, Event[]> = { upcoming: [], ongoing: [], past: [] }
		mockEvents.forEach((event) => {
			const status = getEventStatus(event, now)
			grouped[status].push(event)
		})
		Object.keys(grouped).forEach((key) => grouped[key as EventStatus].sort((a, b) => b.importance - a.importance))
		return grouped
	}, [now])

	// Slider with the nearest upcoming conference or gamelab
	const sliderEvents = eventsByStatus.upcoming.filter((e) => e.type === 'CONFERENCE' || e.type === 'GAMELAB')

	return (
		<ProtectedLayout
			title={t('page.events.title', 'All Events')}
			seo={{ openGraph: { type: 'website', url: router.asPath } }}
			extra={<CreateEventButton />}
		>
			<div className={styles.container}>
				{sliderEvents.length > 0 && (
					<div style={{ marginBottom: 48 }}>
						<BannerEventSlider events={sliderEvents} />
					</div>
				)}

				<EventSection
					title="New Knowledge"
					description="Meetups and workshops for sharing experience, learning, and networking."
					eventTypes={['MEETUP', 'WORKSHOP']}
					eventStatus="upcoming"
					CardComponent={EventCard}
					token={token}
				/>
				<EventSection
					title="Experience & Experiments"
					description="Game jams for practice, experiments, and new connections."
					eventTypes={['GAMEJAM', 'GAMELAB']}
					eventStatus="upcoming"
					CardComponent={EventCard}
					token={token}
				/>
				<EventSection
					title="Some Past Events"
					description="Here are some of the platform's completed events."
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
