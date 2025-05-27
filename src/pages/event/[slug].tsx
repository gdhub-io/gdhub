import React, { useEffect, useState } from 'react'
import { formatEventPeriod } from '@/helpers/format'
import { useWorkDirections } from '@/hooks/library'
import { PublicLayout } from '@/layouts/PublicLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { prisma } from '@/services/prisma'
import { useTolgee } from '@tolgee/react'
import { Button, Col, Grid, Row, Space, Typography, Divider, Avatar, Flex } from 'antd'
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

	return (
		<PublicLayout seo={seo} backgroundImage={event.image || undefined}>
			<div style={{ position: 'relative', maxWidth: 1100, margin: '0 auto', padding: 24 }}>
				{/* Картинка мероприятия по центру, перекрывает header */}
				{event.image && (
					<div
						style={{
							position: 'relative',
							display: 'flex',
							justifyContent: 'center',
							marginTop: -120,
							marginBottom: 32,
							zIndex: 2,
						}}
					>
						<div
							style={{
								position: 'relative',
								width: screens.xs ? '90vw' : '100%',
								maxWidth: '100%',
								aspectRatio: '16/9',
								boxShadow: '0 4px 32px #0002',
								borderRadius: 18,
								overflow: 'hidden',
							}}
						>
							<Image src={event.image} alt={event.title} fill style={{ objectFit: 'cover' }} />
						</div>
					</div>
				)}

				{/* Название и краткое описание */}
				<div style={{ textAlign: 'center', marginBottom: 16 }}>
					<Title level={1} style={{ marginBottom: 8 }}>
						{event.title}
					</Title>
					{event.shortDescription && <Text style={{ fontSize: 18, color: '#666' }}>{event.shortDescription}</Text>}

					{/* Type, Format, Dates */}
					<Flex justify="center" align="middle" gap={32} style={{ margin: '24px 0 0 0' }}>
						<Flex vertical align="center" gap={0}>
							<Text type="secondary" style={{ fontSize: 13 }}>
								{t('event.type', 'Type')}
							</Text>
							<Text strong style={{ fontSize: 16 }}>
								{event.type}
							</Text>
						</Flex>
						<Flex vertical align="center" gap={0}>
							<Text type="secondary" style={{ fontSize: 13 }}>
								{t('event.format', 'Format')}
							</Text>
							<Text strong style={{ fontSize: 16 }}>
								{event.format === 'online' || event.format === 'Онлайн'
									? t('event.format.online', 'Online')
									: t('event.format.offline', 'Offline')}
							</Text>
						</Flex>
						<Flex vertical align="center" gap={0}>
							<Text type="secondary" style={{ fontSize: 13 }}>
								{t('event.dates', 'Dates')}
							</Text>
							<Text strong style={{ fontSize: 16 }}>
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
					</Flex>
				</div>

				<Row gutter={[32, 16]}>
					<Col xs={24}>
						<Space direction="vertical" size={32} style={{ width: '100%' }}>
							<div>
								<Title level={2}>{t('event.about', 'About')}</Title>
								<Paragraph style={{ fontSize: 18 }}>
									<ReactMarkdown rehypePlugins={[rehypeRaw as any]}>{event.description || ''}</ReactMarkdown>
								</Paragraph>
							</div>
							<Divider />
							{/* Современный блок расписания — теперь под About Event! */}
							<Title level={2}>{t('event.schedule', 'Schedule')}</Title>
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
										<Flex
											key={item.id || idx}
											gap={32}
											style={{
												borderBottom: idx !== schedule.length - 1 ? '1px solid #f0f0f0' : 'none',
												padding: '18px 20px',
											}}
										>
											<div
												style={{
													width: 120,
													textAlign: 'right',
													fontWeight: 600,
													fontSize: 14,
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
											<Flex vertical gap={0} style={{ flex: 1, minWidth: 0 }}>
												<div
													style={{
														fontWeight: 600,
														fontSize: 17,
														color: '#222',
														marginBottom: 16,
														whiteSpace: 'nowrap',
														overflow: 'hidden',
														textOverflow: 'ellipsis',
													}}
												>
													{item.title}
												</div>

												{item.speakers?.length > 0 && (
													<Flex gap={8} style={{ marginTop: 4 }}>
														{visibleSpeakers.map((sp: any, i: number) => {
															const speakerName = sp?.user?.profile?.name || sp?.name || ''
															const speakerAvatar = sp?.user?.image || ''
															return (
																<Flex key={sp.id} gap={16}>
																	<Avatar
																		size={42}
																		src={speakerAvatar}
																		style={{ marginRight: 2, background: '#eee', color: '#222', fontSize: 14 }}
																	>
																		{!speakerAvatar && speakerName ? speakerName[0] : null}
																	</Avatar>
																	<Flex vertical gap={0}>
																		<span style={{ fontWeight: 500, fontSize: 14 }}>{speakerName}</span>
																		{sp.name && <Text style={{ fontSize: 13 }}>{sp.name}</Text>}
																	</Flex>
																</Flex>
															)
														})}
														{extraCount > 0 && (
															<span style={{ marginLeft: 8, color: '#888', fontSize: 13 }}>+{extraCount}</span>
														)}
													</Flex>
												)}

												{item.description && (
													<div style={{ color: '#888', fontSize: 14, marginTop: 16 }}>{item.description}</div>
												)}
											</Flex>
										</Flex>
									)
								})}
							</div>
						</Space>
					</Col>
				</Row>
				{/* Кнопка регистрации внизу страницы */}
				{event.url && (
					<div style={{ maxWidth: 420, margin: '40px auto 0', textAlign: 'center' }}>
						<Link href={event.url} target="_blank">
							<Button type="primary" size="large" style={{ width: '100%', maxWidth: 420 }}>
								{t('event.register', 'Register')}
							</Button>
						</Link>
					</div>
				)}
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
