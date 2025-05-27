import React, { useState, useMemo } from 'react'
import { Event, EventType } from '@/mock/events.data'
import { FaChalkboardTeacher } from '@react-icons/all-files/fa/FaChalkboardTeacher'
import { FaMicroscope } from '@react-icons/all-files/fa/FaMicroscope'
import { FaRegCalendarCheck } from '@react-icons/all-files/fa/FaRegCalendarCheck'
import { FaUsers } from '@react-icons/all-files/fa/FaUsers'
import { GiGamepad } from '@react-icons/all-files/gi/GiGamepad'
import { useTolgee } from '@tolgee/react'
import { Card, Tag } from 'antd'
import Image from 'next/image'
import styles from './style.module.scss'

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

export const EventCard = ({ event, token }: { event: Event; token: any }) => {
	const { t } = useTolgee()
	const now = useMemo(() => new Date(), [])
	const [hovered, setHovered] = useState(false)
	const typeLabels: Record<EventType, string> = {
		MEETUP: 'Meetup',
		GAMEJAM: 'Gamejam',
		WORKSHOP: 'Workshop',
		GAMELAB: 'Gamelab',
		CONFERENCE: 'Conference',
	}
	const handleClick = () => {
		console.log('Open event', event.id)
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
						{event.startDate ? event.startDate : ''}
					</Tag>
					{/* <Tag
						color={event.isFree ? 'green' : 'red'}
						style={{
							position: 'absolute',
							bottom: 16,
							right: 16,
							zIndex: 3,
							fontWeight: 600,
						}}
					>
						{event.isFree ? t('event.type.free', 'Free') : t('event.type.paid', 'Paid')}
					</Tag> */}
				</div>
			}
		/>
	)
}
