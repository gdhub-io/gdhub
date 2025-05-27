import React, { useEffect, useState } from 'react'
import { formatEventPeriod } from '@/helpers/format'
import { useWorkDirections } from '@/hooks/library'
import { PublicLayout } from '@/layouts/PublicLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { prisma } from '@/services/prisma'
import { FaUser } from '@react-icons/all-files/fa/FaUser'
import { useTolgee } from '@tolgee/react'
import { Button, Col, Descriptions, Grid, Row, Space, Typography, Divider } from 'antd'
import { GetServerSidePropsContext } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'

const { Title, Paragraph, Text } = Typography

interface EventPageProps {
	event: any
	seo?: { title: string; description?: string; image?: string }
}

const MAX_VISIBLE_SPEAKERS = 3

const EventPage: NextPageWithLayout<EventPageProps> = ({ event, seo }) => {
	const { t, getLanguage } = useTolgee()
	const screens = Grid.useBreakpoint()
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

	// Получить speciality (description) спикера
	const getSpeakerSpeciality = (sp: any) => sp.speciality || sp.description || ''

	return (
		<PublicLayout
			title={event.title}
			subTitle={event.shortDescription}
			backgroundImage={event.image || undefined}
			seo={seo}
		>
			<div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
				<Row gutter={[32, 16]}>
					<Col xs={24} md={14}>
						<Space direction="vertical" size={32} style={{ width: '100%' }}>
							<div>
								<Title level={2}>{t('event.about', 'About Event')}</Title>
								<Paragraph>
									<ReactMarkdown rehypePlugins={[rehypeRaw as any]}>{event.description || ''}</ReactMarkdown>
								</Paragraph>
							</div>
							<Divider />
							{/* Современный блок расписания — теперь под About Event! */}
							<div style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>{t('event.schedule', 'Schedule')}</div>
							<div
								style={{
									background: '#fff',
									borderRadius: 18,
									boxShadow: '0 2px 16px #0001',
									overflow: 'hidden',
									padding: 24,
								}}
							>
								{schedule.map((item: any, idx: number) => {
									const visibleSpeakers = (item.speakers || []).slice(0, MAX_VISIBLE_SPEAKERS)
									const extraCount = (item.speakers?.length || 0) - MAX_VISIBLE_SPEAKERS
									return (
										<div
											key={item.id || idx}
											style={{
												display: 'flex',
												alignItems: 'center',
												borderBottom: idx !== schedule.length - 1 ? '1px solid #f0f0f0' : 'none',
												padding: '18px 20px',
												gap: 18,
											}}
										>
											<div
												style={{
													width: 90,
													textAlign: 'right',
													fontWeight: 600,
													fontSize: 16,
													color: '#222',
													flexShrink: 0,
												}}
											>
												{schedule.length === 1 ? (
													formatEventPeriod(item.startDate, item.endDate, getLanguage() || 'en', 'daytime')
												) : (
													<>
														<span>{item.formattedStartTime24}</span>
														<span style={{ fontSize: 12, color: '#888', marginLeft: 2 }}>{item.formattedAMPM}</span>
													</>
												)}
											</div>
											<div style={{ flex: 1, minWidth: 0 }}>
												<div
													style={{
														fontWeight: 600,
														fontSize: 17,
														color: '#222',
														marginBottom: 2,
														whiteSpace: 'nowrap',
														overflow: 'hidden',
														textOverflow: 'ellipsis',
													}}
												>
													{item.title}
												</div>
												{item.speakers?.length > 0 && (
													<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
														{visibleSpeakers.map((sp: any, i: number) => (
															<span key={sp.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
																<span
																	style={{
																		display: 'inline-block',
																		width: 10,
																		height: 10,
																		borderRadius: '50%',
																		background: getDirectionColor(sp.directionId),
																		marginRight: 4,
																	}}
																/>
																<FaUser style={{ fontSize: 14, marginRight: 2, color: '#222' }} />
																<span style={{ fontWeight: 500 }}>{sp.name}</span>
																{getSpeakerSpeciality(sp) && (
																	<span style={{ color: '#888', fontSize: 13, marginLeft: 4 }}>
																		{getSpeakerSpeciality(sp)}
																	</span>
																)}
															</span>
														))}
														{extraCount > 0 && (
															<span style={{ marginLeft: 8, color: '#888', fontSize: 13 }}>+{extraCount}</span>
														)}
													</div>
												)}
												{item.speakers?.length === 0 && (
													<div style={{ color: '#aaa', fontSize: 14 }}>{t('event.noSpeakers', 'No speakers')}</div>
												)}
												{item.description && (
													<div style={{ color: '#888', fontSize: 14, marginTop: 2 }}>{item.description}</div>
												)}
											</div>
										</div>
									)
								})}
							</div>
						</Space>
					</Col>
					<Col xs={24} md={10}>
						{event.image && (
							<div style={{ position: 'relative', width: '100%', aspectRatio: '1.3', marginBottom: 24 }}>
								<Image src={event.image} alt={event.title} fill style={{ objectFit: 'cover', borderRadius: 12 }} />
							</div>
						)}
						<Descriptions size="small" column={1} bordered>
							<Descriptions.Item label={t('event.type', 'Type')}>{event.type}</Descriptions.Item>
							<Descriptions.Item label={t('event.dates', 'Dates')}>
								{schedule.length > 0
									? `${schedule[0].formattedStartDay}${schedule.length > 1 ? ' - ' + schedule[schedule.length - 1].formattedEndDay : ''}`
									: '-'}
							</Descriptions.Item>
							{event.isFree !== undefined && (
								<Descriptions.Item label={t('event.isFree', 'Free?')}>
									{event.isFree ? t('event.type.free', 'Free') : t('event.type.paid', 'Paid')}
								</Descriptions.Item>
							)}
						</Descriptions>
						{event.url && (
							<Link href={event.url} target="_blank">
								<Button type="primary" block style={{ marginTop: 24 }}>
									{t('event.register', 'Register')}
								</Button>
							</Link>
						)}
					</Col>
				</Row>
			</div>
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
						select: { id: true, name: true },
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
