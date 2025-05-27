import React, { useState, useMemo } from 'react'
import { formatEventPeriod } from '@/helpers/format'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { FaChalkboardTeacher } from '@react-icons/all-files/fa/FaChalkboardTeacher'
import { FaMicroscope } from '@react-icons/all-files/fa/FaMicroscope'
import { FaRegCalendarCheck } from '@react-icons/all-files/fa/FaRegCalendarCheck'
import { FaUsers } from '@react-icons/all-files/fa/FaUsers'
import { GiGamepad } from '@react-icons/all-files/gi/GiGamepad'
import { useTolgee } from '@tolgee/react'
import { Card, Tag } from 'antd'
import Image from 'next/image'
import styles from './style.module.scss'

function getTypeIcon(type: prismaClient.EventType) {
	switch (type) {
		case prismaClient.$Enums.EventType.Meetup:
			return <FaUsers size={28} />
		case prismaClient.$Enums.EventType.GameJam:
			return <GiGamepad size={28} />
		case prismaClient.$Enums.EventType.Workshop:
			return <FaChalkboardTeacher size={28} />
		case prismaClient.$Enums.EventType.GameLab:
			return <FaMicroscope size={28} />
		case prismaClient.$Enums.EventType.Conference:
			return <FaRegCalendarCheck size={28} />
		default:
			return null
	}
}

export const EventCard = ({
	event,
	token,
}: {
	event: prismaClient.Event & { schedule: prismaClient.EventScheduleItem[] }
	token: any
}) => {
	const { t, getLanguage } = useTolgee()
	const now = useMemo(() => new Date(), [])
	const [hovered, setHovered] = useState(false)
	const typeLabels: Record<prismaClient.$Enums.EventType, string> = {
		[prismaClient.$Enums.EventType.Meetup]: 'Meetup',
		[prismaClient.$Enums.EventType.GameJam]: 'Gamejam',
		[prismaClient.$Enums.EventType.Workshop]: 'Workshop',
		[prismaClient.$Enums.EventType.GameLab]: 'Gamelab',
		[prismaClient.$Enums.EventType.Conference]: 'Conference',
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
				event.image ? (
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
								<span className={styles.eventTypeIcon}>{getTypeIcon(event.type)}</span>
								<span className={styles.eventType}>{typeLabels[event.type]}</span>
							</div>
							<div
								className={styles.eventTitle}
								style={{ color: '#fff', fontWeight: 700, fontSize: 20, textShadow: '0 2px 8px #000' }}
							>
								{event.title}
							</div>
							{event.shortDescription ? (
								<div style={{ color: '#fff', fontSize: 15, textShadow: '0 2px 8px #000' }}>
									{event.shortDescription}
								</div>
							) : null}
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
								{t('event.readMore', 'Click to read more')}
							</div>
						</div>
						{Boolean(event.schedule?.length) && (
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
								{formatEventPeriod(
									event.schedule[0].startDate,
									event.schedule[event.schedule.length - 1].endDate,
									getLanguage(),
									'day'
								)}
							</Tag>
						)}
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
				) : null
			}
		/>
	)
}
