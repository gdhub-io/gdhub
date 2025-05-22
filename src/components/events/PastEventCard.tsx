import React from 'react'
import { Event } from '@/mock/events.data'
import { Card } from 'antd'
import Image from 'next/image'

export const PastEventCard = ({ event, token }: { event: Event; token: any }) => (
	<Card
		cover={
			<div style={{ width: '100%', aspectRatio: '1/1.1', overflow: 'hidden', position: 'relative' }}>
				<Image
					src={event.image}
					alt={event.title}
					fill
					style={{ width: '100%', height: '100%', objectFit: 'cover', aspectRatio: '1/1.1', filter: 'grayscale(1)' }}
					sizes="(max-width: 600px) 100vw, 33vw"
				/>
				<div
					style={{
						position: 'absolute',
						bottom: 0,
						left: 0,
						width: '100%',
						padding: 16,
						background: 'linear-gradient(0deg, rgba(30,30,30,0.85) 80%, rgba(30,30,30,0.1) 100%, rgba(0,0,0,0) 100%)',
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
)
