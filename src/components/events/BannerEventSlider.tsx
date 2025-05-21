import React from 'react'
import { Event, mockEvents } from '@/pages/hub/events/mock.data'
import { Carousel, Button, Tag, theme } from 'antd'
import Image from 'next/image'

function getEventStatus(event: Event, now: Date): 'upcoming' | 'ongoing' | 'past' {
	const start = new Date(event.startDate)
	const end = new Date(event.endDate)
	if (now < start) return 'upcoming'
	if (now > end) return 'past'
	return 'ongoing'
}

export const BannerEventSlider = () => {
	const { token } = theme.useToken()
	const now = new Date()
	const events = mockEvents.filter(
		(e) => (e.type === 'CONFERENCE' || e.type === 'GAMELAB') && getEventStatus(e, now) === 'upcoming'
	)
	if (!events.length) return null
	return (
		<div style={{ marginBottom: 48 }}>
			<Carousel autoplay dots={events.length > 1}>
				{events.map((event) => (
					<div key={event.id} style={{ position: 'relative', width: '100%' }}>
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
									{event.startDate}
								</div>
								<div style={{ fontSize: 38, fontWeight: 800, textShadow: '0 2px 8px #000' }}>{event.title}</div>
								<div style={{ fontSize: 22, textShadow: '0 2px 8px #000' }}>{event.description}</div>
								<Button
									type="primary"
									size="large"
									style={{
										borderRadius: 8,
										fontWeight: 700,
										marginTop: 16,
										alignSelf: 'flex-start',
										boxShadow: 'none',
									}}
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
					</div>
				))}
			</Carousel>
		</div>
	)
}
