import React from 'react'
import { formatEventPeriod } from '@/helpers/format'
import { useTolgee } from '@tolgee/react'
import { Button, Typography, Divider, Avatar, Flex, Grid } from 'antd'
import Image from 'next/image'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'

const { Title, Paragraph, Text } = Typography

const MAX_VISIBLE_SPEAKERS = 3

const EventDefaultView = ({ event, workDirections, schedule }: any) => {
	const { t, getLanguage } = useTolgee()
	const screens = Grid.useBreakpoint()
	const { data: session } = useSession()

	return (
		<Flex gap={48} align="flex-start" style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
			{/* Левая колонка: инфо */}
			<div style={{ flex: 1 }}>
				<Title level={2}>{t('event.about', 'About')}</Title>
				<Paragraph style={{ fontSize: 18 }}>
					<ReactMarkdown rehypePlugins={[rehypeRaw as any]}>{event.description || ''}</ReactMarkdown>
				</Paragraph>

				<Flex justify="flex-start" align="middle" gap={32} style={{ margin: '24px 0 0 0' }}>
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

				<Divider />
				<Title level={2}>{t('event.schedule', 'Schedule')}</Title>
				<div
					style={{
						background: '#fff',
						borderRadius: 18,
						boxShadow: '0 2px 16px #0001',
						overflow: 'hidden',
						padding: 24,
						marginBottom: 32,
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
									flexDirection: screens.md ? 'row' : 'column',
									alignItems: screens.md ? 'stretch' : 'flex-start',
								}}
							>
								{/* Дата/время для больших экранов */}
								{screens.md && (
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
								)}

								<Flex vertical gap={0} style={{ flex: 1, minWidth: 0, width: '100%' }}>
									{/* Дата/время для малых экранов */}
									{!screens.md && (
										<div
											style={{
												fontWeight: 600,
												fontSize: 14,
												color: '#222',
												marginBottom: 8,
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
									)}
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
				{event.url && (
					<div style={{ maxWidth: 420, margin: '40px 0 0', textAlign: 'center' }}>
						{session ? (
							<Link href={event.url} target="_blank">
								<Button type="primary" size="large" style={{ width: '100%', maxWidth: 420 }}>
									{t('event.register', 'Register')}
								</Button>
							</Link>
						) : (
							<Link href="/registration">
								<Button type="primary" size="large" style={{ width: '100%', maxWidth: 420 }}>
									{t('event.loginOrRegister', 'Login / Register')}
								</Button>
							</Link>
						)}
					</div>
				)}
			</div>
			{/* Правая колонка: картинка */}
			{event.image && screens.md && (
				<div style={{ flex: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end' }}>
					<div
						style={{
							position: 'relative',
							top: screens.md ? -136 : 0,
							width: '100%',
							maxWidth: 600,
							aspectRatio: '4/5',
							boxShadow: '0 4px 32px #0002',
							borderRadius: 18,
							overflow: 'hidden',
						}}
					>
						<Image src={event.image} alt={event.title} fill style={{ objectFit: 'cover' }} />
					</div>
				</div>
			)}
		</Flex>
	)
}

export default EventDefaultView
