import React from 'react'
import { EventCard, PastEventCard, EventSection, BannerEventSlider } from '@/components/events'
import { PublicLayout } from '@/layouts/PublicLayout'
import { NextPageWithLayout } from '@/pages/_app'
import styles from '@/pages/hub/events/style.module.scss'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { useTolgee } from '@tolgee/react'
import { theme } from 'antd'

const EventsPage: NextPageWithLayout = () => {
	const { t } = useTolgee()
	const { token } = theme.useToken()

	return (
		<PublicLayout title={t('page.events.title', 'Events')} seo={{ openGraph: { type: 'website', url: '/events' } }}>
			<div className={styles.container}>
				<BannerEventSlider />

				<EventSection
					title={t('page.events.newKnowledge', 'New Knowledge')}
					description={t(
						'page.events.newKnowledgeDescription',
						'Meetups and workshops for sharing experience, learning, and networking.'
					)}
					eventTypes={[prismaClient.$Enums.EventType.Meetup, prismaClient.$Enums.EventType.Workshop]}
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
					eventTypes={[prismaClient.$Enums.EventType.GameJam, prismaClient.$Enums.EventType.GameLab]}
					eventStatus="upcoming"
					CardComponent={EventCard}
					token={token}
				/>
				<EventSection
					title={t('page.events.pastEvents', 'Some Past Events')}
					description={t('page.events.pastEventsDescription', "Here are some of the platform's completed events.")}
					eventTypes={[
						prismaClient.$Enums.EventType.Meetup,
						prismaClient.$Enums.EventType.Workshop,
						prismaClient.$Enums.EventType.GameJam,
						prismaClient.$Enums.EventType.GameLab,
						prismaClient.$Enums.EventType.Conference,
					]}
					eventStatus="past"
					CardComponent={PastEventCard}
					token={token}
					colSpan={{ xs: 24, sm: 12, md: 8, lg: 6, xl: 4 }}
				/>
			</div>
		</PublicLayout>
	)
}

export default EventsPage
