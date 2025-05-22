import React from 'react'
// import { Event, mockEvents } from '@/mock/events.data'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { useQuery } from '@tanstack/react-query'
import { useTolgee } from '@tolgee/react'
import { Carousel, Button, Tag, theme } from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'
import Image from 'next/image'
import qs from 'qs'

export const BannerEventSlider = () => {
	const { token } = theme.useToken()
	const { t } = useTolgee()

	const { data: events } = useQuery(['slider-events'], () =>
		axios.get<(prismaClient.Event & { schedule: Pick<prismaClient.EventScheduleItem, 'startDate' | 'endDate'>[] })[]>(
			'/api/events',
			{
				params: {
					type: [prismaClient.$Enums.EventType.Conference, prismaClient.$Enums.EventType.GameLab],
					withDates: true,
				},
				paramsSerializer: (params) => qs.stringify(params, { arrayFormat: 'repeat' }),
			}
		)
	)

	if (!events?.data.length) return null

	return (
		<div style={{ marginBottom: 48 }}>
			<Carousel autoplay dots={events.data.length > 1}>
				{events.data.map((event) => (
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
								src={event.image || ''}
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
									{dayjs(event.schedule[0].startDate).format('DD MMMM')}
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
								{event.isFree ? t('event.type.free', 'Free') : t('event.type.paid', 'Paid')}
							</Tag>
						</div>
					</div>
				))}
			</Carousel>
		</div>
	)
}
