import React from 'react'
import { Event, EventType, mockEvents } from '@/pages/hub/events/mock.data'
import { Row, Col } from 'antd'

interface EventSectionProps {
	title: string
	description?: string
	eventTypes: EventType[]
	eventStatus: 'upcoming' | 'ongoing' | 'past'
	CardComponent: React.ComponentType<{ event: Event; token: any }>
	token: any
	colSpan?: { xs?: number; sm?: number; md?: number; lg?: number; xl?: number }
}

function getEventStatus(event: Event, now: Date): 'upcoming' | 'ongoing' | 'past' {
	const start = new Date(event.startDate)
	const end = new Date(event.endDate)
	if (now < start) return 'upcoming'
	if (now > end) return 'past'
	return 'ongoing'
}

export const EventSection = ({
	title,
	description,
	eventTypes,
	eventStatus,
	CardComponent,
	token,
	colSpan,
}: EventSectionProps) => {
	const now = new Date()
	const events = mockEvents.filter((e) => eventTypes.includes(e.type) && getEventStatus(e, now) === eventStatus)
	if (!events.length) return null
	return (
		<section style={{ marginBottom: 32 }}>
			<h2 style={{ marginTop: 56, marginBottom: 12, fontSize: 22, fontWeight: 700, color: '#222' }}>{title}</h2>
			{description && (
				<div style={{ color: token.colorTextSecondary, fontSize: 16, marginBottom: 20 }}>{description}</div>
			)}
			<Row gutter={[6, 12]}>
				{events.map((event) => (
					<Col key={event.id} {...(colSpan || { xs: 24, sm: 12, md: 8, lg: 8, xl: 6 })}>
						<CardComponent event={event} token={token} />
					</Col>
				))}
			</Row>
		</section>
	)
}
