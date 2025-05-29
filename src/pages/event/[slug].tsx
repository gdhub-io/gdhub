import React, { useEffect, useState } from 'react'
import EventConferenceOrGamelabView from '@/components/event/EventConferenceOrGamelabView'
import EventDefaultView from '@/components/event/EventDefaultView'
import { formatEventPeriod } from '@/helpers/format'
import { useWorkDirections } from '@/hooks/library'
import { PublicLayout } from '@/layouts/PublicLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { prisma } from '@/services/prisma'
import { useTolgee } from '@tolgee/react'
import { Flex, Typography } from 'antd'
import { GetServerSidePropsContext } from 'next'
import styles from './style.module.scss'

const { Text } = Typography

interface EventPageProps {
	event: any
	seo?: { title: string; description?: string; image?: string }
}

const EventPage: NextPageWithLayout<EventPageProps> = ({ event, seo }) => {
	const { data: workDirections } = useWorkDirections()
	const { getLanguage } = useTolgee()

	const [formattedSchedule, setFormattedSchedule] = useState<any[]>([])

	useEffect(() => {
		if (!event?.schedule) return
		setFormattedSchedule(
			event.schedule.map((item: any) => ({
				...item,
				formattedStartDay: new Date(item.startDate).toLocaleDateString(),
				formattedEndDay: new Date(item.endDate).toLocaleDateString(),
				formattedStartTime: new Date(item.startDate).toLocaleTimeString([], {
					hour: '2-digit',
					minute: '2-digit',
					hour12: true,
				}),
				formattedStartTime24: new Date(item.startDate).toLocaleTimeString([], {
					hour: '2-digit',
					minute: '2-digit',
					hour12: false,
				}),
				formattedAMPM: new Date(item.startDate)
					.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
					.split(' ')[1],
				formattedEndTime: new Date(item.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
			}))
		)
	}, [event?.schedule])

	if (!event) return null

	const schedule = formattedSchedule.length ? formattedSchedule : event.schedule || []
	const isConferenceOrGamelab = ['conference', 'gamelab'].includes((event.type || '').toLowerCase())

	return (
		<PublicLayout
			seo={seo}
			extraPosition="top"
			extraGap={0}
			extra={
				!isConferenceOrGamelab && (
					<Flex gap={8} align="center">
						<Text className={styles.extraText}>{event.type}</Text>
						<span style={{ color: '#ffffff54', lineHeight: 1, fontSize: 16 }}>/</span>
						<Text strong style={{ color: '#fff' }}>
							{schedule.length > 0
								? formatEventPeriod(
										schedule[0].startDate,
										schedule[schedule.length - 1].endDate,
										getLanguage() || 'en',
										'day'
									)
								: '-'}
						</Text>
					</Flex>
				)
			}
			title={!isConferenceOrGamelab ? event.title : undefined}
			subTitle={!isConferenceOrGamelab ? event.shortDescription : undefined}
			backgroundImage={event.image || undefined}
			ogImageType={isConferenceOrGamelab ? 'event-big' : 'event-small'}
			ogImageParams={{
				type: event.type,
				date: event.schedule?.length
					? formatEventPeriod(
							event.schedule[0].startDate,
							event.schedule[event.schedule.length - 1].endDate,
							getLanguage(),
							'day'
						)
					: '',
			}}
		>
			{isConferenceOrGamelab ? (
				<EventConferenceOrGamelabView event={event} workDirections={workDirections} schedule={schedule} />
			) : (
				<EventDefaultView event={event} workDirections={workDirections} schedule={schedule} />
			)}
		</PublicLayout>
	)
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
	const { slug }: any = context.params

	const event = await prisma.event.findFirst({
		where: { slug },
		include: {
			schedule: {
				include: {
					speakers: {
						select: {
							id: true,
							name: true,
							user: { select: { image: true, profile: { select: { name: true } } } },
							summary: true,
						},
					},
				},
				orderBy: { startDate: 'asc' },
			},
		},
	})

	if (!event) {
		return { notFound: true }
	}

	return {
		props: {
			event: {
				...event,
				createdAt: event.createdAt?.toISOString(),
				updatedAt: event.updatedAt?.toISOString(),
				publishedAt: event.publishedAt ? event.publishedAt.toISOString() : null,
				schedule:
					event.schedule?.map((item: any) => ({
						...item,
						startDate: item.startDate?.toISOString(),
						endDate: item.endDate?.toISOString(),
						createdAt: item.createdAt?.toISOString?.() ?? null,
						updatedAt: item.updatedAt?.toISOString?.() ?? null,
						publishedAt: item.publishedAt?.toISOString?.() ?? null,
					})) || [],
			},
			seo: {
				title: event.title || null,
				description: event.shortDescription || null,
				image: event.image || null,
			},
		},
	}
}

export default EventPage
