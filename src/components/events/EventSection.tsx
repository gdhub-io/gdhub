import React from 'react'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { useQuery } from '@tanstack/react-query'
import { Row, Col } from 'antd'
import axios from 'axios'
import qs from 'qs'

interface EventSectionProps {
	title: string
	description?: string
	eventTypes: prismaClient.$Enums.EventType[]
	timeStatus: ('upcoming' | 'ongoing' | 'past')[]
	CardComponent: React.ComponentType<{
		event: prismaClient.Event & { schedule: prismaClient.EventScheduleItem[] }
		token: any
	}>
	token: any
	colSpan?: { xs?: number; sm?: number; md?: number; lg?: number; xl?: number }
}

export const EventSection = ({
	title,
	description,
	eventTypes,
	timeStatus,
	CardComponent,
	token,
	colSpan,
}: EventSectionProps) => {
	const now = new Date()

	const { data: events, isLoading } = useQuery({
		queryKey: ['events', eventTypes, timeStatus],
		queryFn: () => {
			return axios.get(`/api/events`, {
				params: {
					type: eventTypes,
					timeStatus,
					withDates: true,
				},
				paramsSerializer: (params) => qs.stringify(params, { arrayFormat: 'repeat' }),
			})
		},
	})

	if (!events?.data.length) return null
	return (
		<section style={{ marginBottom: 32 }}>
			<h2 style={{ marginTop: 56, marginBottom: 12, fontSize: 22, fontWeight: 700, color: '#222' }}>{title}</h2>
			{description && (
				<div style={{ color: token.colorTextSecondary, fontSize: 16, marginBottom: 20 }}>{description}</div>
			)}
			<Row gutter={[6, 12]}>
				{events?.data.map((event: any) => (
					<Col key={event.id} {...(colSpan || { xs: 24, sm: 12, md: 8, lg: 8, xl: 6 })}>
						<CardComponent event={event} token={token} />
					</Col>
				))}
			</Row>
		</section>
	)
}
