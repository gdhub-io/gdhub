import React, { useMemo } from 'react'
import { EventCard, PastEventCard, EventSection, BannerEventSlider } from '@/components/events'
import { hasRole } from '@/helpers/user'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { DownOutlined } from '@ant-design/icons'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { FaChalkboardTeacher } from '@react-icons/all-files/fa/FaChalkboardTeacher'
import { FaMicroscope } from '@react-icons/all-files/fa/FaMicroscope'
import { FaRegCalendarCheck } from '@react-icons/all-files/fa/FaRegCalendarCheck'
import { FaUsers } from '@react-icons/all-files/fa/FaUsers'
import { GiGamepad } from '@react-icons/all-files/gi/GiGamepad'
import { useQuery } from '@tanstack/react-query'
import { useTolgee } from '@tolgee/react'
import { theme, Dropdown, MenuProps, message, Space, Button } from 'antd'
import axios from 'axios'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import qs from 'qs'
import { mockEvents, Event, EventType, EventStatus } from './mock.data'
import styles from '../style.module.scss'

function getEventStatus(event: Event, now: Date): EventStatus {
	const start = new Date(event.startDate)
	const end = new Date(event.endDate)
	if (now < start) return 'upcoming'
	if (now > end) return 'past'
	return 'ongoing'
}

const eventTypeLabels: Record<EventType, string> = {
	MEETUP: 'Meetup',
	WORKSHOP: 'Workshop',
	GAMEJAM: 'Game Jam',
	GAMELAB: 'Game Lab',
	CONFERENCE: 'Conference',
}

const CreateEventButton: React.FC = () => {
	const { data: session } = useSession()
	const { t } = useTolgee()
	const { token } = theme.useToken()
	const isAdmin = hasRole(prismaClient.$Enums.UserRole.Admin, { data: session })

	const { data: specialityLevels } = useQuery(
		['user-speciality-levels', session?.user?.id],
		() =>
			axios
				.get('/api/user/speciality-levels', {
					params: {
						level: [prismaClient.$Enums.SkillLevel.Experienced, prismaClient.$Enums.SkillLevel.Expert],
					},
					paramsSerializer: (params) => qs.stringify(params, { arrayFormat: 'repeat' }),
				})
				.then((res) => res.data),
		{ enabled: !!session?.user?.id }
	)

	const canCreateMeetupOrWorkshop = isAdmin || (Array.isArray(specialityLevels) && specialityLevels.length > 0)

	const items: MenuProps['items'] = [
		canCreateMeetupOrWorkshop && {
			label: (
				<Space size={8}>
					{getTypeIcon('MEETUP', { size: 24, color: token.colorTextSecondary })}
					{eventTypeLabels.MEETUP}
				</Space>
			),
			key: 'MEETUP',
			icon: null,
		},
		canCreateMeetupOrWorkshop && {
			label: (
				<Space size={8}>
					{getTypeIcon('WORKSHOP', { size: 24, color: token.colorTextSecondary })}
					{eventTypeLabels.WORKSHOP}
				</Space>
			),
			key: 'WORKSHOP',
			icon: null,
		},
		isAdmin
			? {
					label: (
						<Space size={8}>
							{getTypeIcon('GAMEJAM', { size: 24, color: token.colorTextSecondary })}
							{eventTypeLabels.GAMEJAM}
						</Space>
					),
					key: 'GAMEJAM',
					icon: null,
				}
			: null,
		isAdmin
			? {
					label: (
						<Space size={8}>
							{getTypeIcon('GAMELAB', { size: 24, color: token.colorTextSecondary })}
							{eventTypeLabels.GAMELAB}
						</Space>
					),
					key: 'GAMELAB',
					icon: null,
				}
			: null,
		isAdmin
			? {
					label: (
						<Space size={8}>
							{getTypeIcon('CONFERENCE', { size: 24, color: token.colorTextSecondary })}
							{eventTypeLabels.CONFERENCE}
						</Space>
					),
					key: 'CONFERENCE',
					icon: null,
				}
			: null,
	].filter((item): item is Exclude<typeof item, boolean | null> => Boolean(item))

	const handleMenuClick: MenuProps['onClick'] = (e) => {
		message.info(`Create event: ${eventTypeLabels[e.key as EventType]}`)
		// TODO: router.push(`/hub/events/create?type=${e.key}`)
	}

	return (
		<Space>
			<Button type="text">My Events</Button>
			<Dropdown menu={{ items, onClick: handleMenuClick }} trigger={['click']}>
				<Button type="primary">
					<Space>
						{t('page.events.createEvent', 'Create Event')}
						<DownOutlined />
					</Space>
				</Button>
			</Dropdown>
		</Space>
	)
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
						<BannerEventSlider />
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

function getTypeIcon(type: EventType, args: { size: number; color: string }) {
	switch (type) {
		case 'MEETUP':
			return <FaUsers {...args} />
		case 'GAMEJAM':
			return <GiGamepad {...args} />
		case 'WORKSHOP':
			return <FaChalkboardTeacher {...args} />
		case 'GAMELAB':
			return <FaMicroscope {...args} />
		case 'CONFERENCE':
			return <FaRegCalendarCheck {...args} />
		default:
			return null
	}
}

export default EventsPage
