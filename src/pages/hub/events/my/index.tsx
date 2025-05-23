import React from 'react'
import { EventCard, PastEventCard, EventSection } from '@/components/events'
import CreateEventButton from '@/components/events/CreateEventButton'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { useTolgee } from '@tolgee/react'
import { theme } from 'antd'
import { useRouter } from 'next/router'
import styles from './style.module.scss'

const MyEventsPage: NextPageWithLayout = () => {
	const { t } = useTolgee()
	const router = useRouter()
	const { token } = theme.useToken()

	return (
		<ProtectedLayout
			title={t('page.myEvents.title', 'My Events')}
			seo={{ openGraph: { type: 'website', url: router.asPath } }}
			extra={<CreateEventButton />}
			showBackButton
			backButtonUrl="/hub/events"
		>
			<div className={styles.container}>
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

export default MyEventsPage
