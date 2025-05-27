import React, { useEffect, useState } from 'react'
import EventConferenceOrGamelabView from '@/components/event/EventConferenceOrGamelabView'
import EventDefaultView from '@/components/event/EventDefaultView'
import { useWorkDirections } from '@/hooks/library'
import { PublicLayout } from '@/layouts/PublicLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { prisma } from '@/services/prisma'
import { GetServerSidePropsContext } from 'next'

interface EventPageProps {
	event: any
	seo?: { title: string; description?: string; image?: string }
}

const EventPage: NextPageWithLayout<EventPageProps> = ({ event, seo }) => {
	const { data: workDirections } = useWorkDirections()

	// --- КЛИЕНТСКОЕ форматирование дат для устранения ошибки гидратации ---
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
	const isSingleSchedule = schedule.length === 1

	// Получить цвет направления
	const getDirectionColor = (directionId: string) => {
		const dir = workDirections?.find((d) => d.id === directionId)
		if (!dir) return '#eee'
		// Преобразуем name в css-переменную
		const cssVar = `--bg-direc-${dir.name.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`
		return typeof window !== 'undefined'
			? getComputedStyle(document.documentElement).getPropertyValue(cssVar) || '#eee'
			: '#eee'
	}

	const isConferenceOrGamelab = ['conference', 'gamelab'].includes((event.type || '').toLowerCase())

	return (
		<PublicLayout
			seo={seo}
			title={!isConferenceOrGamelab ? event.title : undefined}
			subTitle={!isConferenceOrGamelab ? event.shortDescription : undefined}
			backgroundImage={event.image || undefined}
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
						select: { id: true, name: true, user: { select: { image: true, profile: { select: { name: true } } } } },
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
				description: event.shortDescription || event.description?.slice(0, 160) || null,
				image: event.image || null,
			},
		},
	}
}

export default EventPage
