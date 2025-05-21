import React, { useMemo, useState } from 'react'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { FaChalkboardTeacher } from '@react-icons/all-files/fa/FaChalkboardTeacher'
import { FaMicroscope } from '@react-icons/all-files/fa/FaMicroscope'
import { FaRegCalendarCheck } from '@react-icons/all-files/fa/FaRegCalendarCheck'
import { FaUsers } from '@react-icons/all-files/fa/FaUsers'
import { GiGamepad } from '@react-icons/all-files/gi/GiGamepad'
import { useTolgee } from '@tolgee/react'
import { theme, Card, Button, Row, Col, Tag, Carousel } from 'antd'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { mockEvents, Event, EventType, EventStatus } from './mock.data'
import styles from '../style.module.scss'

dayjs.extend(relativeTime)

const EVENT_TYPES = {
	MEETUP: 'meetup',
	GAMEJAM: 'gamejam',
	WORKSHOP: 'workshop',
	GAMELAB: 'gamelab',
	CONFERENCE: 'conference',
} as const

function getEventStatus(event: Event, now: Date): EventStatus {
	const start = new Date(event.startDate)
	const end = new Date(event.endDate)
	if (now < start) return 'upcoming'
	if (now > end) return 'past'
	return 'ongoing'
}

const userCanCreateTypes: EventType[] = ['MEETUP', 'GAMEJAM', 'WORKSHOP']

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

	// 1. Слайдер с ближайшей upcoming конференцией или геймлабой
	const sliderEvents = eventsByStatus.upcoming.filter((e) => e.type === 'CONFERENCE' || e.type === 'GAMELAB')

	// 2. Новые знания: митапы и воркшопы (upcoming)
	const knowledgeEvents = eventsByStatus.upcoming.filter((e) => e.type === 'MEETUP' || e.type === 'WORKSHOP')

	// 3. Опыт и эксперименты: геймджемы (upcoming)
	const gamejamEvents = eventsByStatus.upcoming.filter((e) => e.type === 'GAMEJAM')

	// 4. Прошедшие события (любые, уменьшенные карточки)
	const pastEvents = eventsByStatus.past.slice(0, 6)

	return (
		<ProtectedLayout
			title={t('page.events.title', 'All Events')}
			seo={{ openGraph: { type: 'website', url: router.asPath } }}
			extra={
				<Button className={styles.createBtn} size="large">
					Add Event
				</Button>
			}
		>
			<div className={styles.container}>
				{sliderEvents.length > 0 && (
					<div style={{ marginBottom: 48 }}>
						<Carousel autoplay dots={sliderEvents.length > 1}>
							{sliderEvents.map((event) => (
								<BannerEventCard key={event.id} event={event} token={token} />
							))}
						</Carousel>
					</div>
				)}

				<EventSection title="New Knowledge" events={knowledgeEvents} token={token} />
				<EventSection title="Experience & Experiments" events={gamejamEvents} token={token} />
				<MiniPastEventsSection events={pastEvents} token={token} />
			</div>
		</ProtectedLayout>
	)
}

function getTypeIcon(type: EventType) {
	switch (type) {
		case 'MEETUP':
			return <FaUsers size={28} />
		case 'GAMEJAM':
			return <GiGamepad size={28} />
		case 'WORKSHOP':
			return <FaChalkboardTeacher size={28} />
		case 'GAMELAB':
			return <FaMicroscope size={28} />
		case 'CONFERENCE':
			return <FaRegCalendarCheck size={28} />
		default:
			return null
	}
}

function MainEventBlock({ event, token }: { event: Event; token: any }) {
	const typeLabels: Record<EventType, string> = {
		MEETUP: 'Meetup',
		GAMEJAM: 'Gamejam',
		WORKSHOP: 'Workshop',
		GAMELAB: 'Gamelab',
		CONFERENCE: 'Conference',
	}
	return (
		<div
			className={styles.mainEventBlock}
			style={{ background: token.colorBgContainer, boxShadow: token.boxShadowSecondary }}
		>
			<div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
				<div style={{ color: token.colorPrimary }}>{getTypeIcon(event.type)}</div>
				<div className={styles.mainEventType}>{typeLabels[event.type]}</div>
			</div>
			<div className={styles.mainEventTitle}>{event.title}</div>
			<div className={styles.mainEventDates} style={{ color: token.colorTextSecondary }}>
				{event.startDate} – {event.endDate}
			</div>
			<div className={styles.mainEventDesc}>{event.description}</div>
		</div>
	)
}

function EventSection({ title, events, token }: { title: string; events: Event[]; token: any }) {
	if (!events.length) return <div className={styles.emptySection}>No events</div>
	const descriptions: Record<string, string> = {
		'New Knowledge': 'Meetups and workshops for sharing experience, learning, and networking.',
		'Experience & Experiments': 'Game jams for practice, experiments, and new connections.',
	}
	return (
		<section className={styles.section}>
			<h2 className={styles.sectionTitle} style={{ marginTop: 56, marginBottom: 12 }}>
				{title}
			</h2>
			{descriptions[title] && (
				<div style={{ color: token.colorTextSecondary, fontSize: 16, marginBottom: 20 }}>{descriptions[title]}</div>
			)}
			<Row gutter={[6, 12]}>
				{events.map((event) => (
					<Col xs={24} sm={12} md={8} lg={8} xl={6} key={event.id}>
						<EventCard event={event} token={token} />
					</Col>
				))}
			</Row>
		</section>
	)
}

function getEventStatusLabel(event: Event, now: Date) {
	const start = new Date(event.startDate)
	const end = new Date(event.endDate)
	if (now < start) return 'Upcoming'
	if (now > end) return 'Past'
	return 'Ongoing'
}

function EventCard({ event, token }: { event: Event; token: any }) {
	const now = useMemo(() => new Date(), [])
	const [hovered, setHovered] = useState(false)
	const typeLabels: Record<EventType, string> = {
		MEETUP: 'Meetup',
		GAMEJAM: 'Gamejam',
		WORKSHOP: 'Workshop',
		GAMELAB: 'Gamelab',
		CONFERENCE: 'Conference',
	}
	const status = getEventStatusLabel(event, now)
	const handleClick = () => {
		// Здесь можно реализовать переход на страницу события
		console.log('Открыть событие', event.id)
	}
	return (
		<Card
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			onClick={handleClick}
			style={{
				borderRadius: 16,
				overflow: 'hidden',
				boxShadow: hovered ? token.boxShadowSecondary : token.boxShadow,
				background: token.colorBgContainer,
				display: 'flex',
				flexDirection: 'column',
				width: '100%',
				aspectRatio: '1/1.1',
				margin: '0 auto',
				cursor: 'pointer',
				transition: 'box-shadow 0.2s',
				border: undefined,
			}}
			bodyStyle={{ padding: 0, height: 0 }}
			cover={
				<div style={{ position: 'relative', width: '100%', aspectRatio: '1/1.1', overflow: 'hidden' }}>
					<Image
						src={event.image}
						alt={event.title}
						fill
						style={{ objectFit: 'cover', aspectRatio: '1/1.1' }}
						sizes="(max-width: 600px) 100vw, 33vw"
					/>
					<div
						style={{
							position: 'absolute',
							bottom: 0,
							left: 0,
							width: '100%',
							padding: 20,
							background: 'linear-gradient(0deg, rgba(0,0,0,0.75) 70%, rgba(0,0,0,0.1) 100%, rgba(0,0,0,0) 100%)',
							color: '#fff',
							zIndex: 2,
							display: 'flex',
							flexDirection: 'column',
							gap: 8,
						}}
					>
						<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
							<span
								className={styles.eventTypeIcon}
								style={{ color: token.colorPrimary, filter: 'drop-shadow(0 0 2px #000)' }}
							>
								{getTypeIcon(event.type)}
							</span>
							<span className={styles.eventType}>{typeLabels[event.type]}</span>
						</div>
						<div
							className={styles.eventTitle}
							style={{ color: '#fff', fontWeight: 700, fontSize: 20, textShadow: '0 2px 8px #000' }}
						>
							{event.title}
						</div>
						<div style={{ color: '#fff', fontSize: 15, textShadow: '0 2px 8px #000' }}>{event.description}</div>
						<div
							style={{
								fontWeight: 600,
								color: hovered ? token.colorError : token.colorTextSecondary,
								fontSize: 15,
								marginTop: 8,
								transition: 'color 0.2s, opacity 0.2s',
								opacity: hovered ? 1 : 0,
							}}
						>
							Details
						</div>
					</div>
					<Tag
						style={{
							position: 'absolute',
							top: 16,
							right: 16,
							zIndex: 3,
							background: token.colorBgContainer,
							color: token.colorText,
							fontWeight: 600,
						}}
					>
						{getEventDateLabel(event)}
					</Tag>
					<Tag
						color={event.isFree ? 'green' : 'red'}
						style={{
							position: 'absolute',
							bottom: 16,
							right: 16,
							zIndex: 3,
							fontWeight: 600,
						}}
					>
						{event.isFree ? 'Free' : 'Paid'}
					</Tag>
				</div>
			}
		/>
	)
}

function BannerEventCard({ event, token }: { event: Event; token: any }) {
	const now = useMemo(() => new Date(), [])
	const status = getEventStatusLabel(event, now)
	const typeLabels: Record<EventType, string> = {
		MEETUP: 'Meetup',
		GAMEJAM: 'Gamejam',
		WORKSHOP: 'Workshop',
		GAMELAB: 'Gamelab',
		CONFERENCE: 'Conference',
	}
	return (
		<div
			style={{
				position: 'relative',
				width: '100%',
				aspectRatio: '2.5/1',
				borderRadius: 24,
				overflow: 'hidden',
				background: token.colorBgContainer,
				boxShadow: token.boxShadowSecondary,
				margin: '0 auto',
			}}
		>
			<Image
				src={event.image}
				alt={event.title}
				fill
				style={{ objectFit: 'cover', aspectRatio: '2.5/1' }}
				sizes="100vw"
			/>
			<div
				style={{
					position: 'absolute',
					inset: 0,
					background: 'linear-gradient(90deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 70%, rgba(0,0,0,0) 100%)',
					color: '#fff',
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'center',
					padding: '40px 64px',
					gap: 18,
				}}
			>
				<div
					style={{
						fontWeight: 700,
						fontSize: 28,
						color: '#fff',
						textShadow: '0 2px 8px #000',
						marginBottom: 8,
					}}
				>
					{getEventDateLabel(event)}
				</div>
				<div style={{ fontSize: 38, fontWeight: 800, textShadow: '0 2px 8px #000' }}>{event.title}</div>
				<div style={{ fontSize: 22, textShadow: '0 2px 8px #000' }}>{event.description}</div>
				<Button
					type="primary"
					size="large"
					style={{ borderRadius: 8, fontWeight: 700, marginTop: 16, alignSelf: 'flex-start', boxShadow: 'none' }}
				>
					Details
				</Button>
			</div>
			<Tag
				color={event.isFree ? 'green' : 'red'}
				style={{
					position: 'absolute',
					bottom: 16,
					right: 16,
					zIndex: 3,
					fontWeight: 600,
				}}
			>
				{event.isFree ? 'Free' : 'Paid'}
			</Tag>
		</div>
	)
}

function MiniPastEventsSection({ events, token }: { events: Event[]; token: any }) {
	if (!events.length) return null
	return (
		<section className={styles.section}>
			<h2 className={styles.sectionTitle} style={{ marginTop: 56, marginBottom: 12 }}>
				Some Past Events
			</h2>
			<div style={{ color: token.colorTextSecondary, fontSize: 16, marginBottom: 20 }}>
				Here are some of the platform&apos;s completed events.
			</div>
			<Row gutter={[6, 12]}>
				{events.map((event) => (
					<Col xs={24} sm={12} md={8} lg={6} xl={4} key={event.id}>
						<Card
							cover={
								<div style={{ width: '100%', aspectRatio: '1/1.1', overflow: 'hidden', position: 'relative' }}>
									<Image
										src={event.image}
										alt={event.title}
										fill
										style={{
											width: '100%',
											height: '100%',
											objectFit: 'cover',
											aspectRatio: '1/1.1',
											filter: 'grayscale(1)',
										}}
										sizes="(max-width: 600px) 100vw, 33vw"
									/>
									<div
										style={{
											position: 'absolute',
											bottom: 0,
											left: 0,
											width: '100%',
											padding: 16,
											background:
												'linear-gradient(0deg, rgba(30,30,30,0.85) 80%, rgba(30,30,30,0.1) 100%, rgba(0,0,0,0) 100%)',
											color: '#fff',
											zIndex: 2,
											display: 'flex',
											flexDirection: 'column',
											gap: 8,
										}}
									>
										<div style={{ fontWeight: 700, fontSize: 20, marginBottom: 4 }}>{event.title}</div>
										<div style={{ color: token.colorTextSecondary, fontSize: 16 }}>
											{event.startDate} – {event.endDate}
										</div>
									</div>
								</div>
							}
							style={{
								borderRadius: 12,
								overflow: 'hidden',
								boxShadow: token.boxShadow,
								background: token.colorBgContainer,
								width: '100%',
								aspectRatio: '1/1.1',
								margin: '0 auto',
							}}
							bodyStyle={{ padding: 0, height: 0 }}
						/>
					</Col>
				))}
			</Row>
		</section>
	)
}

function getEventDateLabel(event: Event) {
	const start = dayjs(event.startDate)
	return start.format('MMM D')
}

export default EventsPage
